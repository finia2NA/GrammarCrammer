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

const JUDGMENT_INSTRUCTIONS: Record<string, string> = {
  Japanese: `\
When judging Japanese answers, accept は/が alternation (topic vs emphasized subject marking) as correct IF AND ONLY IF both options are grammatically valid for the sentence and the grammar point being studied, \
UNLESS the hint specifically requires one, or the grammar topic being studied is about particle \
usage. The same applies to other particles with overlapping usage (e.g. に/で for location).`,
};

const CASE_EXTRACTION_INSTRUCTIONS: Record<string, string> = {
  Japanese: `\
Do NOT use romaji transliterations of Japanese words.
When the topic applies to verbs, check whether learners need distinct practice for 一段 verbs, 五段 verbs, する, and 来る.
Split 五段 verbs by final kana only when the actual rule differs or learners must choose a different transformation. For forms like て-form or た-form, 五段 usually needs separate cases for:
- う・つ・る → って / った
- む・ぶ・ぬ → んで / んだ
- く → いて / いた
- ぐ → いで / いだ
- す → して / した
- 行く as the 行って / 行った exception
Also consider nouns, い-adjectives, な-adjectives, negative, past, polite/plain register, particles, and irregular exceptions when they require different learner decisions.
Keep broader categories together when the same rule genuinely applies across them.`,
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

export function getCaseExtractionInstructions(language: string): string {
  return CASE_EXTRACTION_INSTRUCTIONS[language] ?? '';
}
