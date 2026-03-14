import { Platform } from 'react-native';
import type { Card } from './types';
import {
  EXPLANATION_PROMPT,
  CARD_GEN_PROMPT,
  JUDGMENT_PROMPT,
  REJECTION_PROMPT,
} from '@/constants/prompts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const SONNET = 'claude-sonnet-4-6';
const HAIKU = 'claude-haiku-4-5-20251001';

// ─── Cost calculation ─────────────────────────────────────────────────────────

// Prices in USD per million tokens (as of 2025)
const PRICE: Record<string, { input: number; output: number }> = {
  [SONNET]: { input: 3.00, output: 15.00 },
  [HAIKU]: { input: 0.80, output: 4.00 },
};

export function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICE[model] ?? { input: 3.00, output: 15.00 };
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

// ─── Base fetch helpers ───────────────────────────────────────────────────────

function headers(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

async function checkResponse(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `HTTP ${res.status}`);
  }
}

/**
 * Streaming text call. Uses fetch+ReadableStream on web (finest granularity)
 * and XHR+onprogress on iOS/Android (ReadableStream unavailable there).
 * Fires onChunk for each text delta as it arrives via SSE.
 */
function callTextStream(
  apiKey: string,
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number,
  onChunk: (text: string) => void,
  onCost?: (usd: number) => void,
): Promise<{ wasTruncated: boolean }> {
  const body = JSON.stringify({
    model,
    max_tokens: maxTokens,
    system,
    stream: true,
    messages: [{ role: 'user', content: userMessage }],
  });

  function parseSseLines(
    lines: string[],
    state: { inputTokens: number; outputTokens: number; wasTruncated: boolean },
  ) {
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
      } catch { /* malformed event — skip */ }
    }
  }

  console.log('[claude] callTextStream platform:', Platform.OS);

  // Web: fetch + ReadableStream (finest chunk granularity)
  if (Platform.OS === 'web') {
    return (async () => {
      console.log('[claude] using fetch+ReadableStream path');
      const res = await fetch(ANTHROPIC_API_URL, { method: 'POST', headers: headers(apiKey), body });
      await checkResponse(res);
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
          parseSseLines(lines, state);
        }
      } finally {
        reader.cancel();
      }
      onCost?.(calcCost(model, state.inputTokens, state.outputTokens));
      return { wasTruncated: state.wasTruncated };
    })();
  }

  // Native (iOS/Android): XHR + onprogress
  console.log('[claude] using XHR+onprogress path');
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', ANTHROPIC_API_URL);
    const hdrs = headers(apiKey);
    (Object.keys(hdrs) as (keyof typeof hdrs)[]).forEach(k => xhr.setRequestHeader(k, hdrs[k]));

    let buffer = '';
    let lastIndex = 0;
    const state = { inputTokens: 0, outputTokens: 0, wasTruncated: false };

    function processNew() {
      const newText = xhr.responseText.slice(lastIndex);
      lastIndex = xhr.responseText.length;
      buffer += newText;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      parseSseLines(lines, state);
    }

    xhr.onprogress = processNew;
    xhr.onload = () => {
      console.log('[claude] XHR onload status:', xhr.status);
      processNew();
      if (xhr.status >= 200 && xhr.status < 300) {
        onCost?.(calcCost(model, state.inputTokens, state.outputTokens));
        resolve({ wasTruncated: state.wasTruncated });
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText)?.error?.message ?? `HTTP ${xhr.status}`)); }
        catch { reject(new Error(`HTTP ${xhr.status}`)); }
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.send(body);
  });
}

/**
 * Tool-use call — forces Claude to return structured data matching the given
 * JSON schema. The `input` field of the tool call is returned as a parsed object,
 * so no JSON.parse() or markdown stripping is ever needed.
 */
async function callTool<T>(
  apiKey: string,
  model: string,
  system: string,
  userMessage: string,
  toolName: string,
  toolDescription: string,
  inputSchema: object,
  maxTokens: number,
  onCost?: (usd: number) => void,
): Promise<T> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      tools: [{
        name: toolName,
        description: toolDescription,
        input_schema: inputSchema,
      }],
      tool_choice: { type: 'tool', name: toolName },
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  await checkResponse(res);
  const data = await res.json();
  onCost?.(calcCost(model, data.usage.input_tokens, data.usage.output_tokens));
  const toolUse = data.content.find((b: any) => b.type === 'tool_use');
  return toolUse.input as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Validates an API key. Returns null on success, error message on failure. */
export async function validateApiKey(key: string): Promise<string | null> {
  try {
    await callTextStream(key, HAIKU, 'You are a helpful assistant.', 'Hi', 8, () => { });
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Unknown error';
  }
}

/** Generates a grammar explanation, streaming chunks via onChunk as they arrive. */
export async function generateExplanation(
  apiKey: string,
  topic: string,
  language: string,
  onChunk: (text: string) => void,
  onCost?: (usd: number) => void,
): Promise<{ wasTruncated: boolean }> {
  return callTextStream(
    apiKey,
    SONNET,
    EXPLANATION_PROMPT(topic, language),
    'Please explain the grammar topic for my study session.',
    4096,
    onChunk,
    onCost,
  );
}

/** Generates flashcards via tool use. Returns a shuffled Card[]. */
export async function generateCards(
  apiKey: string,
  topic: string,
  language: string,
  count: number,
  explanation: string,
  onCost?: (usd: number) => void,
): Promise<Card[]> {
  const result = await callTool<{ cards: Omit<Card, 'id'>[] }>(
    apiKey,
    HAIKU,
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
              targetLanguage: { type: 'string', description: `The correct ${language} translation of the English sentence — must be an actual ${language} sentence, not a label or description.` },
              sentenceContext: { type: 'string', description: 'Optional 1–3 word note shown to the learner about context required for the translation that is not evident from the English (e.g. "polite speech", "casual", "humble form"). Omit if the English sentence is unambiguous.' },
              notes: { type: 'string', description: `Optional very brief grammar note, e.g. which pattern is used. Never the full correct sentence in ${language}.` },
            },
            required: ['english', 'targetLanguage'],
          },
        },
      },
      required: ['cards'],
    },
    2000,
    onCost,
  );

  const cards: Card[] = result.cards.map((c, i) => ({ ...c, id: String(i) }));

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Judges whether the user's answer is correct, via tool use. */
export async function judgeAnswer(
  apiKey: string,
  card: Card,
  userAnswer: string,
  language: string,
  onCost?: (usd: number) => void,
): Promise<{ correct: boolean; reason: string }> {
  return callTool<{ correct: boolean; reason: string }>(
    apiKey,
    HAIKU,
    JUDGMENT_PROMPT(card.english, card.targetLanguage, userAnswer, language, card.sentenceContext),
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
    onCost,
  );
}

/** Streams an explanation of why the answer was rejected. */
export async function explainRejection(
  apiKey: string,
  card: Card,
  userAnswer: string,
  language: string,
  onChunk: (text: string) => void,
  onCost?: (usd: number) => void,
): Promise<void> {
  await callTextStream(
    apiKey,
    SONNET,
    REJECTION_PROMPT(card.english, card.targetLanguage, userAnswer, language),
    'Please explain why my answer was wrong.',
    400,
    onChunk,
    onCost,
  );
}
