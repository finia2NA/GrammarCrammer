export type Language = string;

export const CARD_COUNTS = [0, 1, 5, 10, 15, 20] as const;
export type CardCount = (typeof CARD_COUNTS)[number];

export function formatCardCount(v: CardCount): string {
  if (v === 0) return 'Inherit';
  return `${v} card${v === 1 ? '' : 's'}`;
}
