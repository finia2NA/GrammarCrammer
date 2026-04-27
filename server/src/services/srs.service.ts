export interface ReviewSchedule {
  nextIntervalDays: number;
  dueAt: Date;
}

// Maps star rating to interval multiplier. null = fixed 1-day reset.
const MULTIPLIERS: Record<number, number | null> = {
  1: null,
  2: 0.25,
  3: 0.75,
  4: 1.5,
  5: 2.0,
};

/**
 * Return the effective dueAt timestamp (Unix ms) for a deck.
 * If dueAt is already stored, use it. If a deck was studied before SRS was
 * introduced (dueAt=null, lastStudiedAt set), compute it as
 * lastStudiedAt + intervalDays so the deck appears in the schedule immediately.
 * Falls back to now() for decks that have never been studied — always due immediately, like Anki new cards.
 */
export function resolveDueAt(
  dueAt: Date | null,
  lastStudiedAt: Date | null,
  intervalDays: number,
): number | null {
  if (dueAt !== null) return dueAt.getTime();
  if (lastStudiedAt !== null) return lastStudiedAt.getTime() + intervalDays * 86_400_000;
  return Date.now(); // never studied → due immediately
}

/**
 * Calculate the next review date based on star rating and current interval.
 * Swap this function to adopt a more sophisticated algorithm (SM-2, FSRS, etc.)
 * without changing any callers.
 */
export function calculateNextReview(
  stars: 1 | 2 | 3 | 4 | 5,
  currentIntervalDays: number,
): ReviewSchedule {
  const mult = MULTIPLIERS[stars];
  const nextDays = mult === null ? 1 : Math.max(1, currentIntervalDays * mult);
  return {
    nextIntervalDays: nextDays,
    dueAt: new Date(Date.now() + nextDays * 86_400_000),
  };
}
