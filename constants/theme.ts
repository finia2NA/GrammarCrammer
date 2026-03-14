// App color tokens — single source of truth for the GrammarCrammer palette.
// The same hex values are registered as Tailwind custom colors in tailwind.config.js
// under the `gc` namespace (e.g. `bg-gc-bg`, `text-gc-accent`).

import { Platform } from 'react-native';

export const Colors = {
  // ── Backgrounds ────────────────────────────────────────────────────
  bgApp:   '#020617', // slate-950  — screen / page background
  bgCard:  '#0f172a', // slate-900  — cards, bottom sheet, panels
  bgInput: '#1e293b', // slate-800  — inputs, code blocks, UI elements

  // ── Borders ────────────────────────────────────────────────────────
  borderStrong: '#334155', // slate-700
  borderSubtle: '#475569', // slate-600

  // ── Accent (indigo) ────────────────────────────────────────────────
  accent:      '#6366f1', // indigo-500 — primary interactive / highlight color
  accentLight: '#a5b4fc', // indigo-300 — code highlight, active drag indicator

  // ── Text ───────────────────────────────────────────────────────────
  textPrimary:   '#ffffff',
  textSecondary: '#94a3b8', // slate-400
  textTertiary:  '#64748b', // slate-500
  textMuted:     '#475569', // slate-600 — placeholder text
  textLight:     '#e2e8f0', // slate-200 — markdown body
  textSubtle:    '#cbd5e1', // slate-300 — emphasis / em
  textBright:    '#f8fafc', // slate-50  — headings / strong

  // ── Status ─────────────────────────────────────────────────────────
  success:       '#4ade80', // green-400
  successBg:     '#15803d', // green-700
  error:         '#f87171', // red-400
  warning:       '#fbbf24', // amber-400
  warningBg:     '#431407', // amber-950
  warningBorder: '#92400e', // amber-800
} as const;

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif:   "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono:    "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
