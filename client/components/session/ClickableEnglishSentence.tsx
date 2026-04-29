import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { useColors } from '@/constants/theme';
import { wordHint } from '@/lib/api';
import type { Card, WordHint } from '@/lib/types';
import { FuriganaText } from './FuriganaText';

const LINE_HEIGHT = 32;
const POPOVER_HEIGHT = 80;
const POPOVER_WIDTH = 160;
const POPOVER_MARGIN = 8;

interface ClickableEnglishSentenceProps {
  card: Card & { deckId?: string };
  language: string;
  hintCache: React.MutableRefObject<Map<string, WordHint>>;
  addCost: (usd: number) => void;
  dismissSignal?: number;
}

function cleanWord(token: string): string {
  return token.replace(/^[^a-zA-Z0-9''-]+|[^a-zA-Z0-9''-]+$/g, '');
}

export function ClickableEnglishSentence({
  card, language, hintCache, addCost, dismissSignal,
}: ClickableEnglishSentenceProps) {
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<WordHint | null>(null);
  const wordWidths = useRef<Map<number, number>>(new Map());
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreNextDismiss = useRef(false);
  const ignoreNextDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tokens = card.english.split(' ').filter(t => t.length > 0);

  const clearActiveHint = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setActiveIndex(null);
    setHint(null);
    setLoading(false);
  }, []);

  // Ensure vocab popovers do not leak across cards.
  useEffect(() => {
    clearActiveHint();
    ignoreNextDismiss.current = false;
    if (ignoreNextDismissTimer.current) {
      clearTimeout(ignoreNextDismissTimer.current);
      ignoreNextDismissTimer.current = null;
    }
    wordWidths.current.clear();
  }, [card.id, clearActiveHint]);

  // Mobile tap-away support from parent container.
  useEffect(() => {
    if (dismissSignal === undefined) return;
    if (ignoreNextDismiss.current) {
      ignoreNextDismiss.current = false;
      if (ignoreNextDismissTimer.current) {
        clearTimeout(ignoreNextDismissTimer.current);
        ignoreNextDismissTimer.current = null;
      }
      return;
    }
    clearActiveHint();
  }, [dismissSignal, clearActiveHint]);

  useEffect(() => () => {
    if (ignoreNextDismissTimer.current) {
      clearTimeout(ignoreNextDismissTimer.current);
      ignoreNextDismissTimer.current = null;
    }
  }, []);

  const fetchHint = useCallback(async (index: number, token: string) => {
    const clean = cleanWord(token);
    if (!clean) return;

    const cacheKey = `${card.id}:${clean.toLowerCase()}`;
    const cached = hintCache.current.get(cacheKey);
    if (cached) {
      setHint(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHint(null);
    try {
      const result = await wordHint(clean, card.english, card.targetLanguage, language);
      const { cost, ...hintData } = result;
      hintCache.current.set(cacheKey, hintData);
      addCost(cost);
      setActiveIndex(prev => {
        if (prev === index) setHint(hintData);
        return prev;
      });
    } catch {
      // silently ignore — popover just stays empty
    } finally {
      setLoading(false);
    }
  }, [card, language, hintCache, addCost]);

  function showWord(index: number, token: string) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setActiveIndex(index);
    setHint(null);
    fetchHint(index, token);
  }

  function hideWord() {
    hideTimer.current = setTimeout(() => {
      clearActiveHint();
    }, Platform.OS === 'web' ? 150 : 0);
  }

  function toggleWord(index: number, token: string) {
    if (activeIndex === index) {
      setActiveIndex(null);
      setHint(null);
    } else {
      showWord(index, token);
    }
  }

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {tokens.map((token, i) => {
        const isActive = activeIndex === i;
        const isClickable = cleanWord(token).length > 0;
        const wordWidth = wordWidths.current.get(i) ?? 0;

        const interactionProps = Platform.OS === 'web'
          ? {
              onHoverIn: () => isClickable && showWord(i, token),
              onHoverOut: () => hideWord(),
            } as any
          : {
              onPressIn: () => {
                if (!isClickable) return;
                ignoreNextDismiss.current = true;
                if (ignoreNextDismissTimer.current) clearTimeout(ignoreNextDismissTimer.current);
                // Safety valve: if a parent dismiss signal doesn't arrive for this touch,
                // don't let the guard leak to the next outside tap.
                ignoreNextDismissTimer.current = setTimeout(() => {
                  ignoreNextDismiss.current = false;
                  ignoreNextDismissTimer.current = null;
                }, 300);
              },
              onPress: () => isClickable && toggleWord(i, token),
            };

        return (
          <Pressable
            key={i}
            {...interactionProps}
            onLayout={e => wordWidths.current.set(i, e.nativeEvent.layout.width)}
            style={{ position: 'relative', paddingHorizontal: 1, zIndex: isActive ? 100 : 1 }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '600',
                lineHeight: LINE_HEIGHT,
                color: isActive ? (colors.primary as string) : (colors.foreground as string),
                textDecorationLine: isClickable && !isActive ? 'underline' : 'none',
                textDecorationStyle: 'dotted',
                textDecorationColor: colors.foreground_subtle as string,
              }}
            >
              {token}{i < tokens.length - 1 ? ' ' : ''}
            </Text>

            {isActive && (
              <View
                pointerEvents="none"
                style={[
                  styles.popover,
                  {
                    bottom: LINE_HEIGHT + POPOVER_MARGIN,
                    // Center popover horizontally on the word
                    left: -(POPOVER_WIDTH - wordWidth) / 2,
                    width: POPOVER_WIDTH,
                    minHeight: POPOVER_HEIGHT,
                    backgroundColor: colors.surface as string,
                    borderColor: colors.border as string,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.primary as string} />
                ) : hint ? (
                  <>
                    <FuriganaText annotation={hint.with_annotation} baseSize={16} readingSize={9} />
                    <Text style={{ fontSize: 11, color: colors.foreground_secondary as string, marginTop: 4 }}>
                      {hint.word_type}
                    </Text>
                  </>
                ) : null}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  popover: {
    position: 'absolute',
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
});
