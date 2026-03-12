export type LoadPhase = 'explanation' | 'cards';
export type CardPhase = 'input' | 'judging' | 'correct' | 'wrong_explaining' | 'wrong_shown';

export interface Card {
  id: string;
  english: string;
  targetLanguage: string;
  sentenceContext?: string;
  notes?: string;
}
