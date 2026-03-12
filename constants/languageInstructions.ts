/**
 * Per-language supplementary instructions injected into all prompts.
 * Add an entry here to customise model behaviour for a specific language.
 * Languages with no entry are handled fine — they simply get no extra guidance.
 */
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  Japanese: `\
Do NOT use romaji transliterations of Japanese words.`,
};

/** Returns the extra instructions for a language, or an empty string if none are defined. */
export function getLanguageInstructions(language: string): string {
  return LANGUAGE_INSTRUCTIONS[language] ?? '';
}
