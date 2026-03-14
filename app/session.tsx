import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiKey } from '@/lib/storage';
import { generateExplanation, generateCards, judgeAnswer, explainRejection } from '@/lib/claude';
import type { Card, CardPhase } from '@/lib/types';
import {
  SidePanel,
  BottomSheet,
  ExplanationOverlay,
  FlashcardDeck,
  PEEK_HEIGHT,
} from '@/components/session';

const SIDEBAR_INITIAL_WIDTH = 320;

export default function Session() {
  const router = useRouter();
  const { topic, language, count } = useLocalSearchParams<{
    topic: string; language: string; count: string;
  }>();

  const { width } = useWindowDimensions();
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
    setPanelNarrowed(true);
    setTimeout(() => {
      setShowOverlay(false);
      setTransitionDone(true);
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

  // ── Render: error ──────────────────────────────────────────────────────────

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

  // ── Render: done ───────────────────────────────────────────────────────────

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

  // ── Shared flashcard deck props ────────────────────────────────────────────

  const deckProps = {
    cards, language: language!, totalCost, cardPhase,
    answer, onChangeAnswer: setAnswer, submittedAnswer,
    feedback, wrongExplanation,
    showHint, onToggleHint: () => setShowHint(true),
    onSubmitAnswer: handleSubmitAnswer,
    onConfirmCorrect: handleConfirmCorrect,
    onConfirmWrong: handleConfirmWrong,
    inputRef,
  };

  // ── Render: session ────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-slate-950">
      {isSmallScreen ? (
        showOverlay ? (
          <ExplanationOverlay
            topic={topic!} explanation={explanation} truncated={explanationTruncated}
            loading={loading} loadPhase={loadPhase}
            onStart={() => setShowOverlay(false)} insets={insets}
          />
        ) : (
          <View className="flex-1">
            <ScrollView className="flex-1" contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: insets.top + 32, paddingBottom: PEEK_HEIGHT + insets.bottom + 32 }}>
              <FlashcardDeck {...deckProps} />
            </ScrollView>
          </View>
        )
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-1 flex-row bg-slate-950">
            {transitionDone ? (
              <SidePanel explanation={explanation} truncated={explanationTruncated} />
            ) : (
              <View style={[
                { overflow: 'hidden' as const },
                Platform.OS === 'web'
                  ? { transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', width: panelNarrowed ? SIDEBAR_INITIAL_WIDTH : '100%' } as any
                  : { width: panelNarrowed ? SIDEBAR_INITIAL_WIDTH : '100%' },
              ]}>
                <ExplanationOverlay
                  topic={topic!} explanation={explanation} truncated={explanationTruncated}
                  loading={loading} loadPhase={loadPhase}
                  onStart={handleStartPractising} insets={insets}
                />
              </View>
            )}

            {panelNarrowed && (
              <View style={[
                { flex: 1 },
                Platform.OS === 'web'
                  ? { opacity: showOverlay ? 0 : 1, transition: 'opacity 0.3s ease', pointerEvents: showOverlay ? 'none' : 'auto' } as any
                  : {},
              ]}>
                <View className="flex-1 items-center justify-center px-8 py-10">
                  <FlashcardDeck {...deckProps} />
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
      {isSmallScreen && !showOverlay && (
        <BottomSheet explanation={explanation} truncated={explanationTruncated} />
      )}
    </View>
  );
}
