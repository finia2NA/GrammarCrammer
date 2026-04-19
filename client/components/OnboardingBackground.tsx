import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/theme';

// ─── Content ──────────────────────────────────────────────────────────────────

const GRAMMAR_WORDS = [
  '文法',        // Japanese
  'Grammatik',   // German
  'Grammaire',   // French
  'Gramática',   // Spanish / Portuguese
  'Грамматика',  // Russian
  '语法',        // Chinese
  'قواعد',       // Arabic
  'व्याकरण',    // Hindi
  'Grammatica',  // Italian
  '문법',        // Korean
  'Gramatika',   // Czech / Slovak
  'Dil Bilgisi', // Turkish
];

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: IoniconName[] = [
  'globe-outline',
  'book-outline',
  'chatbubble-outline',
  'shuffle-outline',
  'language-outline',
];

// ─── Layout engine ────────────────────────────────────────────────────────────

// Sine-hash pseudo-random — deterministic, no import needed
function pr(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const SOURCES = [
  ...GRAMMAR_WORDS.map(w => ({ type: 'text' as const, content: w })),
  ...ICONS.map(n => ({ type: 'icon' as const, content: n })),
];

const COLS = 5;
const ROWS = 12;

interface PlacedItem {
  type: 'text' | 'icon';
  content: string;
  leftPct: number;
  topPct: number;
  rotation: number;
  alpha: number;
  size: number;
}

// Pre-computed at module load — stable across renders
const PLACED: PlacedItem[] = Array.from({ length: COLS * ROWS }, (_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const a = pr(i * 7 + 1);
  const b = pr(i * 7 + 2);
  const c = pr(i * 7 + 3);
  const src = SOURCES[i % SOURCES.length];
  return {
    ...src,
    leftPct: (col / COLS) * 100 + a * (100 / COLS) * 0.7,
    topPct:  (row / ROWS) * 100 + b * (100 / ROWS) * 0.7,
    rotation: (c - 0.5) * 30,
    alpha:    0.07 + a * 0.07,
    size:     src.type === 'icon' ? 26 + Math.round(b * 14) : 11 + Math.round(a * 9),
  };
});

// ─── Component ────────────────────────────────────────────────────────────────

interface OnboardingBackgroundProps {
  /** Tint color for all items. Defaults to the theme primary. */
  color?: string;
}

export function OnboardingBackground({ color }: OnboardingBackgroundProps) {
  const colors = useColors();
  const tint = color ?? colors.primary;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PLACED.map((item, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${item.leftPct}%` as any,
            top:  `${item.topPct}%`  as any,
            transform: [{ rotate: `${item.rotation}deg` }],
            opacity: item.alpha,
          }}
        >
          {item.type === 'icon' ? (
            <Ionicons
              name={item.content as IoniconName}
              size={item.size}
              color={tint}
            />
          ) : (
            <Text style={{ color: tint, fontSize: item.size, fontWeight: '500' }}>
              {item.content}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}
