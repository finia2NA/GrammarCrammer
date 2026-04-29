import { DEFAULT_LANGUAGES } from './languages.js';

export const SETTING_DEFAULTS: Record<string, string> = {
  card_order: 'shuffled',
  judge_with_explanation: 'on',
  feedback_brevity: 'normal',
  default_card_count: '10',
  api_key_preference: 'central',
  enabled_languages: JSON.stringify(DEFAULT_LANGUAGES),
  daily_due_time: '01:00',
  review_timezone: 'UTC',
};
