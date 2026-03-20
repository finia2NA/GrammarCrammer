import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { decrypt } from './crypto.service.js';
import { setExplanation, setExplanationError, setExplanationGenerating } from './deck.service.js';
import { sseHeaders, sendChunk, sendDone, sendError } from '../lib/sse.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  EXPLANATION_PROMPT,
  CARD_GEN_PROMPT,
  JUDGMENT_PROMPT,
  REJECTION_PROMPT,
  CARD_CHAT_PROMPT,
} from '../constants/prompts.js';
import type { Card } from '../types/index.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const SONNET = 'claude-sonnet-4-6';
const HAIKU = 'claude-haiku-4-5-20251001';

const PRICE: Record<string, { input: number; output: number }> = {
  [SONNET]: { input: 3.00, output: 15.00 },
  [HAIKU]: { input: 0.80, output: 4.00 },
};

function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICE[model] ?? { input: 3.00, output: 15.00 };
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

// ─── Get user's API key ──────────────────────────────────────────────────────

async function getUserApiKey(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { claudeApiKey: true },
  });
  if (!user?.claudeApiKey) {
    throw new AppError(400, 'NO_API_KEY', 'No Claude API key configured. Please add one in settings.');
  }
  return decrypt(user.claudeApiKey);
}

function headers(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
  };
}

// ─── Server-side streaming ───────────────────────────────────────────────────

async function callTextStream(
  apiKey: string,
  model: string,
  system: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<{ wasTruncated: boolean; cost: number }> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ model, max_tokens: maxTokens, system, stream: true, messages }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const state = { inputTokens: 0, outputTokens: 0, wasTruncated: false };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        try {
          const ev = JSON.parse(jsonStr);
          if (ev.type === 'message_start') {
            state.inputTokens = ev.message?.usage?.input_tokens ?? 0;
          } else if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
            onChunk(ev.delta.text);
          } else if (ev.type === 'message_delta') {
            state.outputTokens = ev.usage?.output_tokens ?? state.outputTokens;
            if (ev.delta?.stop_reason === 'max_tokens') state.wasTruncated = true;
          }
        } catch { /* malformed event */ }
      }
    }
  } finally {
    reader.cancel();
  }

  return {
    wasTruncated: state.wasTruncated,
    cost: calcCost(model, state.inputTokens, state.outputTokens),
  };
}

async function callTool<T>(
  apiKey: string,
  model: string,
  system: string,
  userMessage: string,
  toolName: string,
  toolDescription: string,
  inputSchema: object,
  maxTokens: number,
): Promise<{ result: T; cost: number }> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      tools: [{ name: toolName, description: toolDescription, input_schema: inputSchema }],
      tool_choice: { type: 'tool', name: toolName },
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }

  const data = await res.json() as any;
  const cost = calcCost(model, data.usage.input_tokens, data.usage.output_tokens);
  const toolUse = data.content.find((b: any) => b.type === 'tool_use');
  return { result: toolUse.input as T, cost };
}

// ─── Background explanation generation ───────────────────────────────────────

const inFlight = new Map<string, Promise<void>>();

export function generateDeckExplanation(userId: string, deckId: string): Promise<void> {
  const existing = inFlight.get(deckId);
  if (existing) return existing;

  const promise = runExplanation(userId, deckId).finally(() => inFlight.delete(deckId));
  inFlight.set(deckId, promise);
  return promise;
}

async function runExplanation(userId: string, deckId: string): Promise<void> {
  const apiKey = await getUserApiKey(userId);

  const deck = await prisma.deck.findUnique({ where: { nodeId: deckId } });
  if (!deck) throw new Error(`Deck ${deckId} not found`);

  await setExplanationGenerating(deckId);

  let fullText = '';
  try {
    await callTextStream(
      apiKey, SONNET,
      EXPLANATION_PROMPT(deck.topic, deck.language),
      [{ role: 'user', content: 'Please explain the grammar topic for my study session.' }],
      4096,
      (chunk) => { fullText += chunk; },
    );
    await setExplanation(deckId, fullText);
  } catch (e) {
    await setExplanationError(deckId);
    throw e;
  }
}

// ─── Streaming SSE endpoint for explanation ──────────────────────────────────

export async function streamExplanation(req: Request, res: Response, userId: string, deckId: string) {
  const apiKey = await getUserApiKey(userId);
  const deck = await prisma.deck.findUnique({ where: { nodeId: deckId } });
  if (!deck) throw new AppError(404, 'NOT_FOUND', 'Deck not found.');

  await setExplanationGenerating(deckId);

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  sseHeaders(res);

  let fullText = '';
  try {
    const { wasTruncated, cost } = await callTextStream(
      apiKey, SONNET,
      EXPLANATION_PROMPT(deck.topic, deck.language),
      [{ role: 'user', content: 'Please explain the grammar topic for my study session.' }],
      4096,
      (chunk) => {
        fullText += chunk;
        sendChunk(res, { type: 'text', text: chunk });
      },
      controller.signal,
    );
    await setExplanation(deckId, fullText);
    sendDone(res, { cost, wasTruncated });
  } catch (e) {
    await setExplanationError(deckId);
    if (!controller.signal.aborted) {
      sendError(res, e instanceof Error ? e.message : 'Unknown error');
    }
  }
}

// ─── Public AI endpoints ─────────────────────────────────────────────────────

export async function generateCards(userId: string, topic: string, language: string, count: number, explanation: string) {
  const apiKey = await getUserApiKey(userId);

  const { result, cost } = await callTool<{ cards: Omit<Card, 'id'>[] }>(
    apiKey, HAIKU,
    CARD_GEN_PROMPT(topic, language, count, explanation),
    'Generate the flashcards now.',
    'generate_flashcards',
    'Output the requested flashcard pairs.',
    {
      type: 'object',
      properties: {
        cards: {
          type: 'array',
          minItems: count,
          maxItems: count,
          items: {
            type: 'object',
            properties: {
              english: { type: 'string', description: 'The English sentence the learner must translate.' },
              targetLanguage: { type: 'string', description: `The correct ${language} translation.` },
              sentenceContext: { type: 'string', description: 'Optional 1–3 word context note.' },
              notes: { type: 'string', description: 'Optional grammar note.' },
            },
            required: ['english', 'targetLanguage'],
          },
        },
      },
      required: ['cards'],
    },
    2000,
  );

  const cards: Card[] = result.cards.map((c, i) => ({ ...c, id: String(i) }));
  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return { cards, cost };
}

export async function judgeAnswer(userId: string, card: Card, userAnswer: string, language: string, explanation?: string) {
  const apiKey = await getUserApiKey(userId);

  const { result, cost } = await callTool<{ correct: boolean; reason: string }>(
    apiKey, HAIKU,
    JUDGMENT_PROMPT(card.english, card.targetLanguage, userAnswer, language, card.sentenceContext, explanation),
    'Judge the answer.',
    'submit_judgment',
    'Submit whether the student answer is correct and a one-sentence reason.',
    {
      type: 'object',
      properties: {
        correct: { type: 'boolean' },
        reason: { type: 'string' },
      },
      required: ['correct', 'reason'],
    },
    120,
  );

  return { ...result, cost };
}

export async function streamRejection(
  req: Request, res: Response,
  userId: string, card: Card, userAnswer: string, language: string,
) {
  const apiKey = await getUserApiKey(userId);
  const controller = new AbortController();
  req.on('close', () => controller.abort());

  sseHeaders(res);

  try {
    const { cost } = await callTextStream(
      apiKey, SONNET,
      REJECTION_PROMPT(card.english, card.targetLanguage, userAnswer, language),
      [{ role: 'user', content: 'Please explain why my answer was wrong.' }],
      400,
      (chunk) => sendChunk(res, { type: 'text', text: chunk }),
      controller.signal,
    );
    sendDone(res, { cost });
  } catch (e) {
    if (!controller.signal.aborted) {
      sendError(res, e instanceof Error ? e.message : 'Unknown error');
    }
  }
}

export async function streamChat(
  req: Request, res: Response,
  userId: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
) {
  const apiKey = await getUserApiKey(userId);
  const controller = new AbortController();
  req.on('close', () => controller.abort());

  sseHeaders(res);

  try {
    const { cost } = await callTextStream(
      apiKey, SONNET, systemPrompt, messages, 600,
      (chunk) => sendChunk(res, { type: 'text', text: chunk }),
      controller.signal,
    );
    sendDone(res, { cost });
  } catch (e) {
    if (!controller.signal.aborted) {
      sendError(res, e instanceof Error ? e.message : 'Unknown error');
    }
  }
}

export async function streamExplanationGeneric(
  req: Request, res: Response,
  userId: string, topic: string, language: string,
) {
  const apiKey = await getUserApiKey(userId);
  const controller = new AbortController();
  req.on('close', () => controller.abort());

  sseHeaders(res);

  try {
    const { wasTruncated, cost } = await callTextStream(
      apiKey, SONNET,
      EXPLANATION_PROMPT(topic, language),
      [{ role: 'user', content: 'Please explain the grammar topic for my study session.' }],
      4096,
      (chunk) => sendChunk(res, { type: 'text', text: chunk }),
      controller.signal,
    );
    sendDone(res, { cost, wasTruncated });
  } catch (e) {
    if (!controller.signal.aborted) {
      sendError(res, e instanceof Error ? e.message : 'Unknown error');
    }
  }
}
