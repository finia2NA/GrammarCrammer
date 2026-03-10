export type Mode = '練習' | '習得';

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
