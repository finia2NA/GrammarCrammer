export type Mode = '練習' | '習得';
export type LoadPhase = 'explanation' | 'cards';
export type CardPhase = 'input' | 'judging' | 'correct' | 'wrong_explaining' | 'wrong_shown';

export interface Card {
  id: string;
  english: string;
  targetLanguage: string;
  notes?: string;
}

export interface SessionConfig {
  topic: string;
  language: string;
  mode: Mode;
  count: number;
}
