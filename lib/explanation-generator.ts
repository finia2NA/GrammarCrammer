import { getApiKey } from './storage';
import { generateExplanation } from './claude';
import { getDeck, setExplanationGenerating, setExplanation, setExplanationError } from './deck-store';

const inFlight = new Map<string, Promise<void>>();

/**
 * Generates an explanation for a deck in the background.
 * Writes directly to the database — no React state involved.
 * Concurrent calls for the same deck are deduplicated.
 */
export function generateDeckExplanation(deckId: string): Promise<void> {
  const existing = inFlight.get(deckId);
  if (existing) return existing;

  const promise = run(deckId).finally(() => inFlight.delete(deckId));
  inFlight.set(deckId, promise);
  return promise;
}

/** Whether a generation is currently in progress for a deck. */
export function isGenerating(deckId: string): boolean {
  return inFlight.has(deckId);
}

async function run(deckId: string): Promise<void> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error('No API key configured');

  const deck = await getDeck(deckId);
  if (!deck) throw new Error(`Deck ${deckId} not found`);

  await setExplanationGenerating(deckId);

  let fullText = '';
  try {
    await generateExplanation(
      apiKey,
      deck.topic,
      deck.language,
      (chunk) => { fullText += chunk; },
    );
    await setExplanation(deckId, fullText);
  } catch (e) {
    await setExplanationError(deckId);
    throw e;
  }
}
