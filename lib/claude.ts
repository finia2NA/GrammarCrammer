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

/** Plain text call — used for free-form responses (explanations). */
async function callText(
  apiKey: string,
  model: string,
  system: string,
  userMessage: string,
  maxTokens: number,
): Promise<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  await checkResponse(res);
  const data = await res.json();
  return data.content[0].text as string;
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
      // Force Claude to call this exact tool — no free-text fallback possible
      tool_choice: { type: 'tool', name: toolName },
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  await checkResponse(res);
  const data = await res.json();
  const toolUse = data.content.find((b: any) => b.type === 'tool_use');
  return toolUse.input as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Validates an API key. Returns null on success, error message on failure. */
export async function validateApiKey(key: string): Promise<string | null> {
  try {
    await callText(key, HAIKU, 'You are a helpful assistant.', 'Hi', 8);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'Unknown error';
  }
}

/** Generates a grammar explanation for the given topic. Returns a text string. */
export async function generateExplanation(
  apiKey: string,
  topic: string,
  language: string,
): Promise<string> {
  return callText(
    apiKey,
    SONNET,
    EXPLANATION_PROMPT(topic, language),
    'Please explain the grammar topic for my study session.',
    1200,
  );
}

/** Generates flashcards via tool use. Returns a shuffled Card[]. */
export async function generateCards(
  apiKey: string,
  topic: string,
  language: string,
  count: number,
): Promise<Card[]> {
  const result = await callTool<{ cards: Omit<Card, 'id'>[] }>(
    apiKey,
    HAIKU,
    CARD_GEN_PROMPT(topic, language, count),
    'Generate the flashcards now.',
    'generate_flashcards',
    'Output the requested flashcard pairs.',
    {
      type: 'object',
      properties: {
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              english:        { type: 'string' },
              targetLanguage: { type: 'string' },
              notes:          { type: 'string' },
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
  return cards;
}

/** Judges whether the user's answer is correct, via tool use. */
export async function judgeAnswer(
  apiKey: string,
  card: Card,
  userAnswer: string,
  language: string,
): Promise<{ correct: boolean; reason: string }> {
  return callTool<{ correct: boolean; reason: string }>(
    apiKey,
    HAIKU,
    JUDGMENT_PROMPT(card.english, card.targetLanguage, userAnswer, language),
    'Judge the answer.',
    'submit_judgment',
    'Submit whether the student answer is correct and a one-sentence reason.',
    {
      type: 'object',
      properties: {
        correct: { type: 'boolean' },
        reason:  { type: 'string' },
      },
      required: ['correct', 'reason'],
    },
    120,
  );
}

/** Generates an explanation of why the answer was rejected. */
export async function explainRejection(
  apiKey: string,
  card: Card,
  userAnswer: string,
  language: string,
): Promise<string> {
  return callText(
    apiKey,
    SONNET,
    REJECTION_PROMPT(card.english, card.targetLanguage, userAnswer, language),
    'Please explain why my answer was wrong.',
    400,
  );
}
