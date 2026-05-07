export type Language = string;

export const CARD_COUNTS = [0, 1, 5, 10, 15, 20] as const;
export type CardCount = (typeof CARD_COUNTS)[number];
