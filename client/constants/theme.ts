import { vars } from 'nativewind';
import { Platform, useColorScheme } from 'react-native';

// ── Raw RGB triples — single source of truth ──────────────────────────────────
// Edit only here. Everything else (CSS vars, hex palette) is derived below.

type RGB = readonly [number, number, number];



const lightRgb: Record<string, RGB> = {
  'background': [255, 248, 235],
  'foreground': [43, 6, 30],  // Midnight Violet
  'card': [255, 255, 255],
  'input': [236, 238, 230],
  'muted': [220, 224, 215],
  'border': [184, 192, 176],
  'muted-foreground': [54, 73, 78],  // Iron Grey
  'primary': [241, 127, 41],  // Harvest Orange
  'primary-foreground': [43, 6, 30],  // Midnight Violet
  'accent': [255, 229, 196],  // Harvest Orange tint
  'destructive': [220, 38, 38],
};

const darkRgb: Record<string, RGB> = {
  ...lightRgb,
};

// ── Derived helpers ───────────────────────────────────────────────────────────

function toHex([r, g, b]: RGB) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function buildVars(rgb: Record<string, RGB>) {
  return vars(Object.fromEntries(
    Object.entries(rgb).map(([k, v]) => [`--color-${k}`, `${v[0]} ${v[1]} ${v[2]}`])
  ));
}

function buildPalette(rgb: Record<string, RGB>) {
  return Object.fromEntries(
    Object.entries(rgb).map(([k, v]) => [k.replace('-', '_').replace('-', '_'), toHex(v)])
  ) as Record<string, string>;
}

// ── NativeWind theme vars — apply to root <View> in _layout.tsx ───────────────

export const darkThemeVars = buildVars(darkRgb);
export const lightThemeVars = buildVars(lightRgb);

// ── JS hex palette — for inline styles, ActivityIndicator, placeholderTextColor

const darkBase = buildPalette(darkRgb);
const lightBase = buildPalette(lightRgb);

// Markdown-specific values (GrammarMarkdown only — no CSS var equivalent)
const darkExtras = {
  primaryLight: '#f9a86a', // Harvest Orange lightened
  mdBody: '#d4d7cc',
  mdSubtle: '#8cc5e3', // Blue Bell lightened
  mdBright: '#f9fbf2',
};

const lightExtras = {
  primaryLight: '#c45e0e', // Harvest Orange darkened
  mdBody: '#2b061e',
  mdSubtle: '#36494e',
  mdBright: '#1a0412',
};

const dark = { ...darkBase, ...darkExtras };
const light = { ...lightBase, ...lightExtras };

// ── Exports ───────────────────────────────────────────────────────────────────

export const Colors = dark;

export function useColors() {
  const scheme = useColorScheme();
  return scheme === 'light' ? light : dark;
}

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace',
  },
  default: {
    sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
