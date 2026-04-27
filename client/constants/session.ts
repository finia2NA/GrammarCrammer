export const LANGUAGES = [
  'Japanese', 'Spanish', 'French', 'German',
  'Korean', 'Mandarin', 'Italian', 'Portuguese',
] as const;
export type Language = (typeof LANGUAGES)[number];

export const CARD_COUNTS = [0, 5, 10, 15, 20] as const;
export type CardCount = (typeof CARD_COUNTS)[number];

export function formatCardCount(v: CardCount): string {
  return v === 0 ? 'Inherit' : `${v} cards`;
}
