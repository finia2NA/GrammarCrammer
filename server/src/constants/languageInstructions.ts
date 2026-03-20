const EXPLANATION_INSTRUCTIONS: Record<string, string> = {
  Japanese: `Do NOT use romaji transliterations of Japanese words.`,
};

const CARD_INSTRUCTIONS: Record<string, string> = {
  Japanese: `\
Do NOT use romaji transliterations of Japanese words.
IMPORTANT — sentenceContext field: Japanese sentences require a specific politeness register and \
particle choices that English does not encode. You MUST always include a "sentenceContext" field \
covering:
1. Politeness register (e.g. "polite speech", "casual", "humble form", "plain form").
2. Any other relevant information not evident by the grammar point and english sentence.`
};
// ALTERNATIVE: explicit は/が instructions:
// 2. When the sentence uses は or が and both particles would be grammatically valid, indicate which \
// is expected — e.g. "polite, topic (は)" or "casual, subject emphasis (が)". Only omit the particle \
// hint if the grammar point itself makes the choice completely unambiguous.`,


const JUDGMENT_INSTRUCTIONS: Record<string, string> = {
  Japanese: `\
When judging Japanese answers, accept は/が alternation (topic vs emphasized subject marking) as correct IF AND ONLY IF both options are grammatically valid for the sentence and the grammar point being studied, \
UNLESS the hint specifically requires one, or the grammar topic being studied is about particle \
usage. The same applies to other particles with overlapping usage (e.g. に/で for location).`,
};


export function getExplanationInstructions(language: string): string {
  return EXPLANATION_INSTRUCTIONS[language] ?? '';
}

export function getCardInstructions(language: string): string {
  return CARD_INSTRUCTIONS[language] ?? '';
}

export function getJudgmentInstructions(language: string): string {
  return JUDGMENT_INSTRUCTIONS[language] ?? '';
}
