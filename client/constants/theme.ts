import { vars } from 'nativewind';
import { Platform, useColorScheme } from 'react-native';

// ── Raw RGB triples — single source of truth ──────────────────────────────────
// Edit only here. Everything else (CSS vars, hex palette) is derived below.

type RGB = readonly [number, number, number];



const lightRgb: Record<string, RGB> = {
  // Backgrounds
  'background':         [253, 240, 224], // #FDF0E0
  'background-warm':    [250, 228, 200], // #FAE4C8
  'background-muted':   [245, 217, 176], // #F5D9B0
  'surface':            [255, 250, 244], // #FFFAF4
  'border':             [232, 201, 154], // #E8C99A
  // Foreground
  'foreground':         [28,  20,  16],  // #1C1410
  'foreground-secondary':[74,  55,  40], // #4A3728
  'foreground-muted':   [122, 96,  80],  // #7A6050
  'foreground-subtle':  [168, 145, 126], // #A8917E
  // Primary — Orange
  'primary':            [245, 160, 90],  // #F5A05A
  'primary-light':      [232, 114, 12],  // #E8720C
  'primary-dark':       [191, 90,  6],   // #BF5A06
  'primary-foreground': [253, 240, 224], // #FDF0E0
  // Secondary — Blue
  'secondary':          [91,  148, 212], // #5B94D4
  'secondary-light':    [37,  99,  168], // #2563A8
  'secondary-dark':     [26,  69,  128], // #1A4580
  'secondary-foreground':[253, 240, 224],// #FDF0E0
  // Accents
  'accent-teal':        [14,  138, 122], // #0E8A7A
  'accent-teal-light':  [75,  189, 174], // #4BBDAE
  'accent-rose':        [176, 48,  80],  // #B03050
  'accent-rose-light':  [212, 112, 138], // #D4708A
  'accent-gold':        [200, 154, 16],  // #C89A10
  'accent-gold-light':  [232, 194, 72],  // #E8C248
  'accent-plum':        [61,  58,  154], // #3D3A9A
  'accent-plum-light':  [123, 120, 204], // #7B78CC
  // Semantic
  'success':            [46,  138, 74],  // #2E8A4A
  'warning':            [184, 112, 16],  // #B87010
  'error':              [200, 50,  40],  // #C83228
  'info':               [37,  99,  168], // #2563A8
  // Badge backgrounds
  'badge-success':      [212, 239, 216], // #D4EFD8
  'badge-warning':      [245, 224, 176], // #F5E0B0
  'badge-error':        [251, 218, 216], // #FBDAD8
  'badge-info':         [208, 228, 247], // #D0E4F7
};

const darkRgb: Record<string, RGB> = {
  // Backgrounds
  'background':         [26,  16,  8],   // #1A1008 (bg)
  'background-warm':    [38,  24,  8],   // #261808 (bg-warm)
  'background-muted':   [51,  32,  16],  // #332010 (bg-muted)
  'surface':            [18,  12,  4],   // #120C04
  'border':             [61,  40,  16],  // #3D2810
  // Foreground
  'foreground':         [245, 232, 208], // #F5E8D0 (fg)
  'foreground-secondary':[212, 184, 150],// #D4B896 (fg-secondary)
  'foreground-muted':   [154, 120, 96],  // #9A7860 (fg-muted)
  'foreground-subtle':  [106, 80,  64],  // #6A5040 (fg-subtle)
  // Primary — Orange
  'primary':            [245, 160, 90],  // #F5A05A
  'primary-light':      [240, 120, 24],  // #F07818
  'primary-dark':       [200, 96,  16],  // #C86010
  'primary-foreground': [26,  16,  8],   // #1A1008
  // Secondary — Blue
  'secondary':          [138, 184, 232], // #8AB8E8
  'secondary-light':    [91,  148, 212], // #5B94D4
  'secondary-dark':     [37,  99,  168], // #2563A8
  'secondary-foreground':[26, 16,  8],   // #1A1008
  // Accents
  'accent-teal':        [75,  189, 174], // #4BBDAE
  'accent-teal-light':  [130, 212, 200], // #82D4C8
  'accent-rose':        [212, 112, 138], // #D4708A
  'accent-rose-light':  [232, 160, 176], // #E8A0B0
  'accent-gold':        [232, 194, 72],  // #E8C248
  'accent-gold-light':  [245, 216, 120], // #F5D878
  'accent-plum':        [123, 120, 204], // #7B78CC
  'accent-plum-light':  [168, 166, 224], // #A8A6E0
  // Semantic
  'success':            [72,  184, 106], // #48B86A
  'warning':            [216, 152, 48],  // #D89830
  'error':              [232, 88,  72],  // #E85848
  'info':               [91,  148, 212], // #5B94D4
  // Badge backgrounds
  'badge-success':      [14,  42,  24],  // #0E2A18 (badge-success-bg)
  'badge-warning':      [42,  26,  4],   // #2A1A04 (badge-warning-bg)
  'badge-error':        [42,  12,  8],   // #2A0C08 (badge-error-bg)
  'badge-info':         [10,  30,  56],  // #0A1E38 (badge-info-bg)
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
