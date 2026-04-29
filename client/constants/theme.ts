import { createContext, useContext } from 'react';
import { vars } from 'nativewind';
import { Platform, useColorScheme } from 'react-native';

// ── Raw RGB triples — single source of truth ──────────────────────────────────
// Edit only here. Everything else (CSS vars, hex palette) is derived below.

type RGB = readonly [number, number, number];
export type ThemePalette = Record<string, string> & {
  primaryLight: string;
  mdBody: string;
  mdSubtle: string;
  mdBright: string;
};



const lightRgb: Record<string, RGB> = {
  // Backgrounds
  'background': [253, 240, 224], // #FDF0E0
  'background-warm': [250, 228, 200], // #FAE4C8
  'background-muted': [245, 217, 176], // #F5D9B0
  'surface': [255, 250, 244], // #FFFAF4
  'border': [232, 201, 154], // #E8C99A
  // Foreground
  'foreground': [28, 20, 16],  // #1C1410
  'foreground-secondary': [74, 55, 40], // #4A3728
  'foreground-muted': [122, 96, 80],  // #7A6050
  'foreground-subtle': [168, 145, 126], // #A8917E
  // Primary — Orange
  'primary': [232, 114, 12],  // #E8720C
  'primary-light': [245, 160, 90],  // #F5A05A
  'primary-dark': [191, 90, 6],   // #BF5A06
  'primary-foreground': [253, 240, 224], // #FDF0E0
  // Secondary — Blue
  'secondary-light': [91, 148, 212], // #5B94D4
  'secondary': [37, 99, 168], // #2563A8
  'secondary-dark': [26, 69, 128], // #1A4580
  'secondary-foreground': [253, 240, 224],// #FDF0E0
  // Accents
  'accent-teal': [14, 138, 122], // #0E8A7A
  'accent-teal-light': [75, 189, 174], // #4BBDAE
  'accent-rose': [176, 48, 80],  // #B03050
  'accent-rose-light': [212, 112, 138], // #D4708A
  'accent-gold': [200, 154, 16],  // #C89A10
  'accent-gold-light': [232, 194, 72],  // #E8C248
  'accent-plum': [61, 58, 154], // #3D3A9A
  'accent-plum-light': [123, 120, 204], // #7B78CC
  // Semantic
  'success': [46, 138, 74],  // #2E8A4A
  'warning': [184, 112, 16],  // #B87010
  'error': [200, 50, 40],  // #C83228
  'info': [37, 99, 168], // #2563A8
  // Badge backgrounds
  'badge-success': [212, 239, 216], // #D4EFD8
  'badge-warning': [245, 224, 176], // #F5E0B0
  'badge-error': [251, 218, 216], // #FBDAD8
  'badge-info': [208, 228, 247], // #D0E4F7
};

const darkRgb: Record<string, RGB> = {
  // Backgrounds (Option 1: Ink Charcoal + Citrus)
  'background': [20, 21, 23],   // #141517
  'background-warm': [25, 27, 30],   // #191B1E
  'background-muted': [31, 33, 37],  // #1F2125
  'surface': [27, 29, 33],   // #1B1D21
  'border': [43, 47, 54],  // #2B2F36
  // Foreground
  'foreground': [243, 235, 221], // #F3EBDD
  'foreground-secondary': [212, 201, 181],// #D4C9B5
  'foreground-muted': [165, 154, 136],  // #A59A88
  'foreground-subtle': [123, 115, 101],  // #7B7365
  // Primary — Orange
  'primary': [240, 120, 24],  // #F07818
  'primary-light': [245, 160, 90],  // #F5A05A
  'primary-dark': [200, 96, 16],  // #C86010
  'primary-foreground': [20, 21, 23],   // #141517
  // Secondary — Blue
  'secondary': [91, 148, 212], // #5B94D4
  'secondary-light': [138, 184, 232], // #8AB8E8
  'secondary-dark': [37, 99, 168], // #2563A8
  'secondary-foreground': [253, 240, 224],   // #141517
  // Accents
  'accent-teal': [75, 189, 174], // #4BBDAE
  'accent-teal-light': [130, 212, 200], // #82D4C8
  'accent-rose': [212, 112, 138], // #D4708A
  'accent-rose-light': [232, 160, 176], // #E8A0B0
  'accent-gold': [232, 194, 72],  // #E8C248
  'accent-gold-light': [245, 216, 120], // #F5D878
  'accent-plum': [123, 120, 204], // #7B78CC
  'accent-plum-light': [168, 166, 224], // #A8A6E0
  // Semantic
  'success': [72, 184, 106], // #48B86A
  'warning': [216, 152, 48],  // #D89830
  'error': [232, 88, 72],  // #E85848
  'info': [91, 148, 212], // #5B94D4
  // Badge backgrounds
  'badge-success': [17, 38, 26],  // #11261A
  'badge-warning': [43, 36, 18],   // #2B2412
  'badge-error': [43, 23, 22],   // #2B1716
  'badge-info': [18, 37, 58],  // #12253A
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
  primaryLight: '#BF5A06', // --primary-dark
  mdBody: '#1C1410',       // --fg
  mdSubtle: '#4A3728',     // --fg-secondary
  mdBright: '#1C1410',     // --fg
};

export const dark: ThemePalette = { ...darkBase, ...darkExtras };
export const light: ThemePalette = { ...lightBase, ...lightExtras };

// ── Exports ───────────────────────────────────────────────────────────────────

export const Colors: ThemePalette = dark;

// Context lets _layout.tsx push the authoritative colors down the tree.
// Children call useColors() without needing their own useColorScheme() subscription.
export const ColorsContext = createContext<ThemePalette>(dark);

export function useColors(): ThemePalette {
  return useContext(ColorsContext);
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
