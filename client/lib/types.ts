export type LoadPhase = 'explanation' | 'cards';
export type CardPhase = 'input' | 'judging' | 'correct' | 'wrong_explaining' | 'wrong_shown';

export interface Card {
  id: string;
  english: string;
  targetLanguage: string;
  sentenceContext?: string;
  notes?: string;
}

export type ExplanationStatus = 'pending' | 'generating' | 'ready' | 'error';

export interface DeckData {
  nodeId: string;
  topic: string;
  language: string;
  explanation: string | null;
  explanationStatus: ExplanationStatus;
  cardCount: number;
  lastStudiedAt: number | null;
}

export interface TreeNode {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
  deck: DeckData | null;   // null = collection
  children: TreeNode[];    // populated by getTree()
}

export interface DeckCard extends Card {
  deckId: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
