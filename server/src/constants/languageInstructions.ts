const EXPLANATION_INSTRUCTIONS: Record<string, string> = {
  Japanese: `Do NOT use romaji transliterations of Japanese words.`,
};

const CARD_INSTRUCTIONS: Record<string, string> = {
  Japanese: `\
Do NOT use romaji transliterations of Japanese words.
IMPORTANT — sentenceContext field: Japanese sentences require a specific politeness register that \
English does not encode. You MUST always include a "sentenceContext" field naming the required \
register (e.g. "polite speech", "casual", "humble form", "plain form"). Only omit it if the \
grammar point itself makes the register completely unambiguous.`,
};

export function getExplanationInstructions(language: string): string {
  return EXPLANATION_INSTRUCTIONS[language] ?? '';
}

export function getCardInstructions(language: string): string {
  return CARD_INSTRUCTIONS[language] ?? '';
}
