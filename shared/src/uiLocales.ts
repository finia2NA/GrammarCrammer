export const UI_LOCALES = ['en', 'de', 'ja'] as const;
export type UiLocale = typeof UI_LOCALES[number];

export const UI_LOCALE_LABELS: Record<UiLocale, string> = {
  en: 'English',
  de: 'Deutsch',
  ja: '日本語',
};

export const UI_LOCALE_LANGUAGE_NAMES: Record<UiLocale, string> = {
  en: 'English',
  de: 'German',
  ja: 'Japanese',
};

export function isUiLocale(value: string | null | undefined): value is UiLocale {
  return value === 'en' || value === 'de' || value === 'ja';
}

export function normalizeUiLocale(value: string | null | undefined): UiLocale {
  if (!value) return 'en';
  const lower = value.toLowerCase();
  if (lower.startsWith('de')) return 'de';
  if (lower.startsWith('ja')) return 'ja';
  return 'en';
}
