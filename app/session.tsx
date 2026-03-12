import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getApiKey } from '@/lib/storage';
import { generateExplanation, generateCards, judgeAnswer, explainRejection } from '@/lib/claude';
import type { Card, CardPhase } from '@/lib/types';

// ─── Markdown styles ──────────────────────────────────────────────────────────

const mdStyles = StyleSheet.create({
  body:          { color: '#e2e8f0' },
  heading1:      { color: '#f8fafc', fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  heading2:      { color: '#f1f5f9', fontSize: 17, fontWeight: '700', marginTop: 14, marginBottom: 6 },
  heading3:      { color: '#e2e8f0', fontSize: 15, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  paragraph:     { fontSize: 13, lineHeight: 22, marginBottom: 10 },
  strong:        { color: '#f8fafc', fontWeight: '700' },
  em:            { fontStyle: 'italic', color: '#cbd5e1' },
  code_inline:   { backgroundColor: '#1e293b', color: '#a5b4fc', fontFamily: 'monospace', fontSize: 12, borderRadius: 4, paddingHorizontal: 4 },
  fence:         { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, marginVertical: 8 },
  code_block:    { backgroundColor: '#1e293b', borderRadius: 8, padding: 12, marginVertical: 8, color: '#a5b4fc', fontFamily: 'monospace', fontSize: 12 },
  bullet_list:   { marginBottom: 8 },
  ordered_list:  { marginBottom: 8 },
  list_item:     { marginBottom: 4 },
  hr:            { backgroundColor: '#334155', height: 1, marginVertical: 12 },
  blockquote:    { backgroundColor: '#1e293b', borderLeftColor: '#6366f1', borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4, marginVertical: 8 },
  table:         { borderColor: '#334155' },
  th:            { backgroundColor: '#1e293b', padding: 6 },
  td:            { borderColor: '#334155', padding: 6 },
  tr:            { borderColor: '#334155' },
});

// ─── Side panel ───────────────────────────────────────────────────────────────

function SidePanel({ explanation, truncated }: { explanation: string; truncated: boolean }) {
  const [width, setWidth] = useState(320);
  const widthRef = useRef(320);
  const [isDragging, setIsDragging] = useState(false);

  function onDragHandlePress(e: any) {
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

  return (
    <View style={{ width, flexDirection: 'row', height: '100%' } as any}>
      {/* Panel content */}
      <View className="bg-slate-900 flex-1">
        <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Grammar Reference
          </Text>
          <Markdown style={mdStyles}>{explanation}</Markdown>
          {truncated && <TruncationWarning />}
        </ScrollView>
      </View>

      {/* Drag handle — replaces the static border */}
      <View
        onStartShouldSetResponder={() => true}
        onResponderGrant={onDragHandlePress}
        style={{
          width: 6,
          cursor: 'col-resize',
          backgroundColor: isDragging ? '#6366f1' : '#1e293b',
          alignItems: 'center',
          justifyContent: 'center',
        } as any}
      >
        {/* Grip dots */}
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: 2,
              height: 2,
              borderRadius: 1,
              backgroundColor: isDragging ? '#a5b4fc' : '#475569',
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
  const [expanded, setExpanded] = useState(false);
  const animHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animHeight, { toValue: PEEK_HEIGHT, useNativeDriver: false, bounciness: 4 }).start();
  }, []);

  const toggle = () => {
    const target = expanded ? PEEK_HEIGHT : height * 0.65;
    Animated.spring(animHeight, { toValue: target, useNativeDriver: false, bounciness: 4 }).start();
    setExpanded(e => !e);
  };

  return (
    <Animated.View
      style={{
        height: animHeight,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0f172a',
        borderTopWidth: 1,
        borderTopColor: '#1e293b',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Handle + header */}
      <TouchableOpacity onPress={toggle} className="items-center pt-2 pb-1">
        <View className="w-10 h-1 bg-slate-600 rounded-full" />
      </TouchableOpacity>
      <View className="flex-row items-center justify-between px-5 pb-2">
        <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
          Grammar Reference
        </Text>
        {expanded && (
          <TouchableOpacity onPress={toggle}>
            <Text className="text-slate-500 text-xs">↓ Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Scrollable content */}
      {expanded && (
        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}>
          <Markdown style={mdStyles}>{explanation}</Markdown>
          {truncated && <TruncationWarning />}
        </ScrollView>
      )}
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

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950">
        <ScrollView
          className="flex-1 px-8 py-12"
          contentContainerStyle={{ maxWidth: 720, alignSelf: 'center', width: '100%' }}
        >
          <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-6">
            {loadPhase === 'cards' ? 'Generating flashcards…' : 'Generating explanation…'}
          </Text>
          {explanation ? (
            <Markdown style={mdStyles}>{explanation}</Markdown>
          ) : (
            <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
          )}
          {loadPhase === 'cards' && (
            <View className="flex-row items-center gap-2 mt-6">
              <ActivityIndicator size="small" color="#6366f1" />
              <Text className="text-slate-500 text-sm">Generating flashcards…</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center px-8 gap-4">
        <Text className="text-red-400 text-base text-center">{loadError}</Text>
        <TouchableOpacity className="bg-slate-800 rounded-xl px-6 py-3" onPress={() => router.back()}>
          <Text className="text-white font-semibold">← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: done ──────────────────────────────────────────────────────────

  if (cards.length === 0) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center px-8 gap-6">
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

  const currentCard = cards[0];
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
              placeholderTextColor="#475569"
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
            <ActivityIndicator color="#f87171" />
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
    <KeyboardAvoidingView
      className="flex-1 bg-slate-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {isSmallScreen ? (
        // ── Small screen: full-screen overlay → cards + bottom sheet ──────────
        showOverlay ? (
          <View className="flex-1 bg-slate-950">
            <ScrollView
              className="flex-1 px-8 py-12"
              contentContainerStyle={{ maxWidth: 720, alignSelf: 'center', width: '100%' }}
            >
              <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">
                Grammar Explanation
              </Text>
              <Text className="text-white text-2xl font-bold mb-6">{topic}</Text>
              <Markdown style={mdStyles}>{explanation}</Markdown>
              {explanationTruncated && <TruncationWarning />}
              <View className="h-8" />
            </ScrollView>
            <View className="px-8 pb-10" style={{ maxWidth: 720, alignSelf: 'center', width: '100%' } as any}>
              <TouchableOpacity
                className="bg-indigo-600 rounded-2xl py-4 items-center"
                onPress={() => setShowOverlay(false)}
              >
                <Text className="text-white font-bold text-base">Start Practising →</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-1" style={{ paddingBottom: PEEK_HEIGHT }}>
            <ScrollView className="flex-1" contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 }}>
              {cardsJsx}
            </ScrollView>
            <BottomSheet explanation={explanation} truncated={explanationTruncated} />
          </View>
        )
      ) : (
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
                className="flex-1 px-8 py-12"
                contentContainerStyle={{ maxWidth: 720, alignSelf: 'center', width: '100%' }}
              >
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-2">
                  Grammar Explanation
                </Text>
                <Text className="text-white text-2xl font-bold mb-6">{topic}</Text>
                <Markdown style={mdStyles}>{explanation}</Markdown>
                {explanationTruncated && <TruncationWarning />}
                <View className="h-8" />
              </ScrollView>
              <View className="px-8 pb-10" style={{ maxWidth: 720, alignSelf: 'center', width: '100%' } as any}>
                <TouchableOpacity
                  className="bg-indigo-600 rounded-2xl py-4 items-center"
                  onPress={handleStartPractising}
                >
                  <Text className="text-white font-bold text-base">Start Practising →</Text>
                </TouchableOpacity>
              </View>
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
  );
}
