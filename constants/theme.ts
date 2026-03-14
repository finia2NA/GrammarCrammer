import { Platform, useColorScheme } from 'react-native';

// ── Color palettes ────────────────────────────────────────────────────────────
// Values mirror the CSS variables in global.css.

const dark = {
  background:        '#020617', // slate-950
  foreground:        '#ffffff',
  card:              '#0f172a', // slate-900
  input:             '#1e293b', // slate-800
  muted:             '#334155', // slate-700
  border:            '#475569', // slate-600
  mutedForeground:   '#94a3b8', // slate-400
  primary:           '#6366f1', // indigo-500
  primaryForeground: '#ffffff',
  destructive:       '#f87171', // red-400

  success:       '#4ade80', // green-400
  successBg:     '#15803d', // green-700
  warning:       '#fbbf24', // amber-400
  warningBg:     '#431407', // amber-950
  warningBorder: '#92400e', // amber-800

  // Markdown-specific (session.tsx mdStyles only)
  primaryLight: '#a5b4fc', // indigo-300
  mdBody:       '#e2e8f0', // slate-200
  mdSubtle:     '#cbd5e1', // slate-300
  mdBright:     '#f8fafc', // slate-50
} as const;

const light = {
  background:        '#f8fafc', // slate-50
  foreground:        '#0f172a', // slate-900
  card:              '#ffffff',
  input:             '#f1f5f9', // slate-100
  muted:             '#e2e8f0', // slate-200
  border:            '#cbd5e1', // slate-300
  mutedForeground:   '#475569', // slate-600
  primary:           '#6366f1', // indigo-500
  primaryForeground: '#ffffff',
  destructive:       '#dc2626', // red-600

  success:       '#16a34a', // green-600
  successBg:     '#dcfce7', // green-100
  warning:       '#d97706', // amber-600
  warningBg:     '#fef3c7', // amber-100
  warningBorder: '#fcd34d', // amber-300

  primaryLight: '#4f46e5', // indigo-600
  mdBody:       '#1e293b', // slate-800
  mdSubtle:     '#475569', // slate-600
  mdBright:     '#0f172a', // slate-900
} as const;

// ── Exports ───────────────────────────────────────────────────────────────────

// Static dark-theme constants — for StyleSheet.create() and other non-hook contexts.
export const Colors = dark;

// Hook for components — returns the palette matching the current color scheme.
export function useColors() {
  const scheme = useColorScheme();
  return scheme === 'light' ? light : dark;
}

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
