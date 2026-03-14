import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiKey } from '@/lib/storage';
import { generateExplanation, generateCards, judgeAnswer, explainRejection } from '@/lib/claude';
import type { Card, CardPhase } from '@/lib/types';
import { Colors } from '@/constants/theme';

// ─── Markdown styles ──────────────────────────────────────────────────────────

const mdStyles = StyleSheet.create({
  body:          { color: Colors.mdBody },
  heading1:      { color: Colors.mdBright, fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  heading2:      { color: Colors.mdBright, fontSize: 17, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  heading3:      { color: Colors.mdBody, fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  paragraph:     { fontSize: 13, lineHeight: 22, marginBottom: 10 },
  strong:        { color: Colors.mdBright, fontWeight: '700' },
  em:            { fontStyle: 'italic', color: Colors.mdSubtle },
  code_inline:   { backgroundColor: Colors.input, color: Colors.primaryLight, fontFamily: 'monospace', fontSize: 12, borderRadius: 4, paddingHorizontal: 4 },
  fence:         { backgroundColor: Colors.input, borderRadius: 8, padding: 12, marginVertical: 8 },
  code_block:    { backgroundColor: Colors.input, borderRadius: 8, padding: 12, marginVertical: 8, color: Colors.primaryLight, fontFamily: 'monospace', fontSize: 12 },
  bullet_list:   { marginBottom: 8 },
  ordered_list:  { marginBottom: 8 },
  list_item:     { marginBottom: 4 },
  hr:            { backgroundColor: Colors.muted, height: 1, marginVertical: 12 },
  blockquote:    { backgroundColor: Colors.input, borderLeftColor: Colors.primary, borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, marginVertical: 8 },
  table:         { borderColor: Colors.muted },
  th:            { backgroundColor: Colors.input, padding: 6 },
  td:            { borderColor: Colors.muted, padding: 6 },
  tr:            { borderColor: Colors.muted },
});

// ─── Side panel ───────────────────────────────────────────────────────────────

function SidePanel({ explanation, truncated }: { explanation: string; truncated: boolean }) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(320);
  const widthRef = useRef(320);
  const [isDragging, setIsDragging] = useState(false);

  // ── Web: pointer-event drag (mouse + Apple Pencil on iPad web) ─────────────
  function onDragHandlePressWeb(e: any) {
    const startX: number = e.nativeEvent.clientX ?? e.nativeEvent.pageX;
    const startWidth = widthRef.current;
    setIsDragging(true);

    function onPointerMove(ev: PointerEvent) {
      ev.preventDefault();
      const next = Math.max(180, Math.min(600, startWidth + ev.clientX - startX));
      setWidth(next);
      widthRef.current = next;
    }

    function onPointerUp() {
      setIsDragging(false);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    }

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  // ── Native (Catalyst, iOS, Android): PanResponder drag ────────────────────
  const dragStartWidthRef = useRef(320);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStartWidthRef.current = widthRef.current;
        setIsDragging(true);
      },
      onPanResponderMove: (_, { dx }) => {
        const next = Math.max(180, Math.min(600, dragStartWidthRef.current + dx));
        setWidth(next);
        widthRef.current = next;
      },
      onPanResponderRelease: () => setIsDragging(false),
    })
  ).current;

  const dragHandleProps = Platform.OS === 'web'
    ? { onStartShouldSetResponder: () => true, onResponderGrant: onDragHandlePressWeb }
    : panResponder.panHandlers;

  return (
    <View style={{ width, flexDirection: 'row', height: '100%' } as any}>
      {/* Panel content */}
      <View className="bg-slate-900 flex-1">
        <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + 8 }}>
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Grammar Reference
          </Text>
          <Markdown style={mdStyles}>{explanation}</Markdown>
          {truncated && <TruncationWarning />}
        </ScrollView>
      </View>

      {/* Drag handle */}
      <View
        {...dragHandleProps}
        style={{
          width: 6,
          cursor: 'col-resize',
          backgroundColor: isDragging ? Colors.primary : Colors.input,
          alignItems: 'center',
          justifyContent: 'center',
        } as any}
      >
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: 2,
              height: 2,
              borderRadius: 1,
              backgroundColor: isDragging ? Colors.primaryLight : Colors.border,
              marginVertical: 2,
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Bottom sheet (small screens) ─────────────────────────────────────────────

const PEEK_HEIGHT = 72;

function BottomSheet({ explanation, truncated }: { explanation: string; truncated: boolean }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;

  // Refs so PanResponder closures always see current values
  const expandedRef = useRef(false);
  const peekH = PEEK_HEIGHT + insets.bottom;
  const expandH = height * 0.65;
  const peekHRef = useRef(peekH);
  const expandHRef = useRef(expandH);
  useEffect(() => { peekHRef.current = peekH; }, [peekH]);
  useEffect(() => { expandHRef.current = expandH; }, [expandH]);

  useEffect(() => {
    Animated.spring(animHeight, { toValue: peekH, useNativeDriver: false, bounciness: 4 }).start();
  }, []);

  function snapTo(open: boolean) {
    expandedRef.current = open;
    setExpanded(open);
    if (open) Keyboard.dismiss();
    Animated.spring(animHeight, {
      toValue: open ? expandHRef.current : peekHRef.current,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  }

  function makePanHandlers(shouldClaim: () => boolean) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dy }) => shouldClaim() && Math.abs(dy) > 5,
      onPanResponderGrant: () => { animHeight.stopAnimation(); },
      onPanResponderMove: (_, { dy }) => {
        const base = expandedRef.current ? expandHRef.current : peekHRef.current;
        const next = Math.max(peekHRef.current, Math.min(expandHRef.current, base - dy));
        animHeight.setValue(next);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (vy < -0.5 || dy < -40) snapTo(true);
        else if (vy > 0.5 || dy > 40) snapTo(false);
        else snapTo(expandedRef.current);
      },
    });
  }

  // Outer sheet: only claims when collapsed (body drag to expand)
  const outerPan = useRef(makePanHandlers(() => !expandedRef.current)).current;
  // Header: only claims when expanded (header drag to dismiss)
  const headerPan = useRef(makePanHandlers(() => expandedRef.current)).current;

  return (
    <Animated.View
      {...outerPan.panHandlers}
      style={{
        height: animHeight,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.card,
        borderTopWidth: 1,
        borderTopColor: Colors.input,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Handle + header — tap + drag target */}
      <View {...headerPan.panHandlers}>
        <TouchableOpacity onPress={() => snapTo(!expandedRef.current)} className="items-center pt-2 pb-1" activeOpacity={1}>
          <View className="w-10 h-1 bg-slate-600 rounded-full" />
        </TouchableOpacity>
        <View className="flex-row items-center justify-between px-5 pb-2">
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
            Grammar Reference
          </Text>
          {expanded && (
            <TouchableOpacity onPress={() => snapTo(false)}>
              <Text className="text-slate-500 text-xs">↓ Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        scrollEnabled={expanded}
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <Markdown style={mdStyles}>{explanation}</Markdown>
        {truncated && <TruncationWarning />}
      </ScrollView>
    </Animated.View>
  );
}

// ─── Small reusable pieces ────────────────────────────────────────────────────

function TruncationWarning() {
  return (
    <View className="mt-3 px-3 py-2 bg-amber-950 border border-amber-800 rounded-lg">
      <Text className="text-amber-400 text-xs">Explanation was cut off — try a more specific topic.</Text>
    </View>
  );
}

function AnswerBox({ answer }: { answer: string }) {
  return (
    <View className="bg-slate-800 rounded-lg px-3 py-2 gap-1">
      <Text className="text-slate-500 text-xs">Your answer</Text>
      <Text className="text-slate-300 text-sm">{answer}</Text>
    </View>
  );
}

function ExampleBox({ example }: { example: string }) {
  return (
    <View className="bg-slate-800 rounded-lg px-3 py-2 gap-1">
      <Text className="text-slate-500 text-xs">My example sentence</Text>
      <Text className="text-white text-base font-medium">{example}</Text>
    </View>
  );
}

// ─── Session screen ───────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = 320;

export default function Session() {
  const router = useRouter();
  const { topic, language, count } = useLocalSearchParams<{
    topic: string; language: string; count: string;
  }>();

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = width < 768;

  const cardCount = parseInt(count ?? '10', 10);

  // Loading
  const [loading, setLoading] = useState(true);
  const [loadPhase, setLoadPhase] = useState<'explanation' | 'cards'>('explanation');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Content
  const [explanation, setExplanation] = useState('');
  const [explanationTruncated, setExplanationTruncated] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);

  // UI state
  const [showOverlay, setShowOverlay] = useState(true);
  // panelNarrowed triggers the CSS width transition; showOverlay/transitionDone
  // follow after the animation finishes so content never swaps mid-animation.
  const [panelNarrowed, setPanelNarrowed] = useState(false);
  const [transitionDone, setTransitionDone] = useState(false);
  const [cardPhase, setCardPhase] = useState<CardPhase>('input');
  const [answer, setAnswer] = useState('');
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [wrongExplanation, setWrongExplanation] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [totalCost, setTotalCost] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const apiKeyRef = useRef<string>('');

  const addCost = (usd: number) => setTotalCost(prev => prev + usd);

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const key = await getApiKey();
        if (!key) { router.replace('/onboarding'); return; }
        apiKeyRef.current = key;

        // Step 1: stream explanation — accumulate full text for passing to card gen
        let fullExplanation = '';
        const { truncated } = await generateExplanation(
          key, topic!, language!,
          (chunk) => {
            fullExplanation += chunk;
            setExplanation(prev => prev + chunk);
          },
          addCost,
        );
        setExplanationTruncated(truncated);

        // Step 2: generate cards informed by the full explanation
        setLoadPhase('cards');
        const generatedCards = await generateCards(
          key, topic!, language!, cardCount, fullExplanation, addCost,
        );
        setCards(generatedCards);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to generate session.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Focus input when card phase resets ────────────────────────────────────

  useEffect(() => {
    if (cardPhase === 'input' && !showOverlay) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [cardPhase, showOverlay]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSubmitAnswer() {
    const trimmed = answer.trim();
    if (!trimmed || cardPhase !== 'input') return;

    const current = cards[0];
    setSubmittedAnswer(trimmed);
    setCardPhase('judging');

    try {
      const result = await judgeAnswer(apiKeyRef.current, current, trimmed, language!, addCost);

      if (result.correct) {
        setFeedback(result.reason);
        setCardPhase('correct');
      } else {
        setCardPhase('wrong_explaining');
        setWrongExplanation('');
        let firstChunk = true;
        await explainRejection(
          apiKeyRef.current, current, trimmed, language!,
          (chunk) => {
            if (firstChunk) { setCardPhase('wrong_shown'); firstChunk = false; }
            setWrongExplanation(prev => prev + chunk);
          },
          addCost,
        );
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'API error.');
      setCardPhase('input');
    }
  }

  function handleStartPractising() {
    setPanelNarrowed(true); // kick off the CSS width transition
    setTimeout(() => {
      setShowOverlay(false);   // swap content after animation
      setTransitionDone(true); // release the wrapper so drag-resize works
    }, 420);
  }

  function handleConfirmCorrect() {
    setCards((prev) => prev.slice(1));
    setAnswer('');
    setFeedback('');
    setShowHint(false);
    setCardPhase('input');
  }

  function handleConfirmWrong() {
    setCards((prev) => [...prev.slice(1), prev[0]]);
    setAnswer('');
    setWrongExplanation('');
    setShowHint(false);
    setCardPhase('input');
  }

  // ── Render: loading ───────────────────────────────────────────────────────

  if (loadError) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center px-8 gap-4" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Text className="text-red-400 text-base text-center">{loadError}</Text>
        <TouchableOpacity className="bg-slate-800 rounded-xl px-6 py-3" onPress={() => router.back()}>
          <Text className="text-white font-semibold">← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: done ──────────────────────────────────────────────────────────

  if (!loading && cards.length === 0) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center px-8 gap-6" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Text className="text-5xl">🎉</Text>
        <Text className="text-white text-2xl font-bold">Session complete!</Text>
        <Text className="text-slate-400 text-base text-center">
          You cleared all the cards. Great work.
        </Text>
        <TouchableOpacity className="bg-indigo-600 rounded-2xl px-8 py-4" onPress={() => router.replace('/home')}>
          <Text className="text-white font-bold text-base">Back to home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentCard = cards[0] ?? { english: '', targetLanguage: '', notes: '', sentenceContext: '' };

  // ── Shared overlay scroll body (same during loading and ready) ────────────

  const overlayBody = (
    <>
      <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">
        Grammar Explanation
      </Text>
      <Text className="text-white text-2xl font-bold mb-6">{topic}</Text>
      {explanation ? (
        <Markdown style={mdStyles}>{explanation}</Markdown>
      ) : (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      )}
      {!loading && explanationTruncated && <TruncationWarning />}
      <View className="h-8" />
    </>
  );

  const overlayFooter = (loading: boolean, onStart: () => void) => (
    <View className="px-8 pb-10" style={{ maxWidth: 720, alignSelf: 'center', width: '100%' } as any}>
      {loading ? (
        <View className="flex-row items-center justify-center gap-3 py-4">
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text className="text-slate-500 text-sm">
            {loadPhase === 'cards' ? 'Generating flashcards…' : 'Generating explanation…'}
          </Text>
        </View>
      ) : (
        <TouchableOpacity className="bg-indigo-600 rounded-2xl py-4 items-center" onPress={onStart}>
          <Text className="text-white font-bold text-base">Start Practising →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  console.log('[card]', JSON.stringify(currentCard, null, 2));

  // ── Cards JSX (shared between small and large layouts) ────────────────────

  const cardsJsx = (
    <>
      {/* Progress + cost */}
      <View className="flex-row justify-between items-center w-full max-w-xl mb-6">
        <Text className="text-slate-500 text-sm">
          {cards.length} card{cards.length !== 1 ? 's' : ''} remaining
        </Text>
        <Text className="text-slate-600 text-xs font-mono">
          ${totalCost.toFixed(4)}
        </Text>
      </View>

      {/* Card */}
      <View className="w-full max-w-xl bg-slate-900 rounded-3xl p-8 mb-6">
        <Text className="text-slate-400 text-xs uppercase tracking-widest mb-3">Translate to {language}</Text>
        <Text className="text-white text-xl font-semibold leading-8 mb-2">
          {currentCard.english}
        </Text>
        {currentCard.sentenceContext && (
          <View className="self-end bg-indigo-950 border border-indigo-700 rounded-md px-2 py-0.5 mb-4">
            <Text className="text-indigo-300 text-xs font-medium">{currentCard.sentenceContext}</Text>
          </View>
        )}

        {/* Input phase */}
        {(cardPhase === 'input' || cardPhase === 'judging') && (
          <>
            <TextInput
              ref={inputRef}
              className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white text-base mb-4"
              placeholder="Your translation…"
              placeholderTextColor={Colors.border}
              value={answer}
              onChangeText={setAnswer}
              onSubmitEditing={handleSubmitAnswer}
              editable={cardPhase === 'input'}
              autoFocus
            />
            <TouchableOpacity
              className={`py-3.5 rounded-xl items-center mb-3 ${
                cardPhase === 'judging' ? 'bg-slate-700' : 'bg-indigo-600'
              }`}
              onPress={handleSubmitAnswer}
              disabled={cardPhase === 'judging'}
            >
              {cardPhase === 'judging' ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold">Check answer</Text>
              )}
            </TouchableOpacity>

            {/* Hint */}
            {currentCard.notes && (
              showHint ? (
                <View className="bg-slate-800 rounded-lg px-3 py-2">
                  <Text className="text-slate-400 text-xs">{currentCard.notes}</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setShowHint(true)}>
                  <Text className="text-slate-600 text-xs text-center">Show hint</Text>
                </TouchableOpacity>
              )
            )}
          </>
        )}

        {/* Correct */}
        {cardPhase === 'correct' && (
          <View className="gap-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-green-400 text-lg">✓</Text>
              <Text className="text-green-400 font-semibold">Correct!</Text>
            </View>
            <AnswerBox answer={submittedAnswer} />
            <Text className="text-slate-300 text-sm leading-6">{feedback}</Text>
            <ExampleBox example={currentCard.targetLanguage} />
            <TouchableOpacity
              className="bg-green-700 rounded-xl py-3.5 items-center mt-2"
              onPress={handleConfirmCorrect}
            >
              <Text className="text-white font-semibold">Next card →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Wrong — explaining */}
        {cardPhase === 'wrong_explaining' && (
          <View className="items-center gap-3 py-2">
            <ActivityIndicator color={Colors.destructive} />
            <Text className="text-slate-400 text-sm">Getting feedback…</Text>
          </View>
        )}

        {/* Wrong — shown */}
        {cardPhase === 'wrong_shown' && (
          <View className="gap-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-red-400 text-lg">✗</Text>
              <Text className="text-red-400 font-semibold">Not quite</Text>
            </View>
            <AnswerBox answer={submittedAnswer} />
            <ExampleBox example={currentCard.targetLanguage} />
            <Markdown style={mdStyles}>{wrongExplanation}</Markdown>
            <TouchableOpacity
              className="bg-amber-700 rounded-xl py-3.5 items-center mt-2"
              onPress={handleConfirmWrong}
            >
              <Text className="text-white font-semibold">Try again later →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );

  // ── Render: session + overlay (unified) ───────────────────────────────────

  return (
    <View className="flex-1 bg-slate-950">
      {isSmallScreen ? (
        // ── Small screen: full-screen overlay → cards + bottom sheet ──────────
        showOverlay ? (
          <View className="flex-1 bg-slate-950">
            <ScrollView
              className="flex-1 px-8"
              contentContainerStyle={{ maxWidth: 720, alignSelf: 'center', width: '100%', paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}
            >
              {overlayBody}
            </ScrollView>
            {overlayFooter(loading, () => setShowOverlay(false))}
          </View>
        ) : (
          <View className="flex-1">
            <ScrollView className="flex-1" contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: insets.top + 32, paddingBottom: PEEK_HEIGHT + insets.bottom + 32 }}>
              {cardsJsx}
            </ScrollView>
          </View>
        )
      ) : (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
        // ── Large screen: explanation panel animates to sidebar ───────────────
        <View className="flex-1 flex-row bg-slate-950">
          {transitionDone ? (
            // After transition: SidePanel is unconstrained so drag-resize works freely
            <SidePanel explanation={explanation} truncated={explanationTruncated} />
          ) : (
            // Before / during transition: wrapper controls width via CSS transition.
            // showOverlay stays true during the animation so content never swaps early.
            <View style={[
              { overflow: 'hidden' as const },
              Platform.OS === 'web'
                ? { transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', width: panelNarrowed ? SIDEBAR_WIDTH : '100%' } as any
                : { width: panelNarrowed ? SIDEBAR_WIDTH : '100%' },
            ]}>
              <ScrollView
                className="flex-1 px-8"
                contentContainerStyle={{ maxWidth: 720, alignSelf: 'center', width: '100%', paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}
              >
                {overlayBody}
              </ScrollView>
              {overlayFooter(loading, handleStartPractising)}
            </View>
          )}

          {/* Cards: mount as soon as panel starts narrowing, then fade in */}
          {panelNarrowed && (
            <View style={[
              { flex: 1 },
              Platform.OS === 'web'
                ? { opacity: showOverlay ? 0 : 1, transition: 'opacity 0.3s ease', pointerEvents: showOverlay ? 'none' : 'auto' } as any
                : {},
            ]}>
              <View className="flex-1 items-center justify-center px-8 py-10">
                {cardsJsx}
              </View>
            </View>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
      )}
      {isSmallScreen && !showOverlay && (
        <BottomSheet explanation={explanation} truncated={explanationTruncated} />
      )}
    </View>
  );
}
