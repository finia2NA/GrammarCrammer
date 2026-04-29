import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, useColors } from '@/constants/theme';
import { judgeAnswer, explainRejection, chatAboutCard, getSetting, getUsageStatus } from '@/lib/api';
import type { Card, CardPhase, DeckCard, ChatMessage, CardAttempt, WordHint } from '@/lib/types';
import { useSessionLoader } from '@/hooks/useSessionLoader';
import { useMultiDeckSession } from '@/hooks/useMultiDeckSession';
import type { DeckInfo } from '@/hooks/useMultiDeckSession';
import type { OverlayDeck } from '@/components/session';

import {
  SidePanel,
  BottomSheet,
  ExplanationOverlay,
  FlashcardDeck,
  SessionCompleteScreen,
  PEEK_HEIGHT,
} from '@/components/session';
import { useScreenSize } from '@/hooks/useScreenSize';

const SIDEBAR_INITIAL_WIDTH = 320;
const TOPBAR_HEIGHT = 56;

function fmtCost(usd: number): string {
  if (usd < 1) return `${(usd * 100).toPrecision(2)}¢`;
  return `$${usd.toFixed(2)}`;
}

// ─── Fixed top bar ───────────────────────────────────────────────────────────

function SessionTopBar({
  cardsRemaining, totalCost, totalSpend, onBack, hasContentBelow, insetTop,
}: {
  cardsRemaining: number;
  totalCost: number;
  totalSpend: number | null;
  onBack: () => void;
  hasContentBelow: boolean;
  insetTop: number;
}) {
  const colors = useColors();

  const inner = (
    <View style={{ height: TOPBAR_HEIGHT, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: 'rgba(128,128,128,0.15)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(128,128,128,0.25)' }}
        >
          <Text style={{ color: colors['foreground'] as string, opacity: 0.7, fontSize: 14, fontWeight: '600' }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: colors['foreground_secondary'] as string, fontSize: 14 }}>
          {cardsRemaining} card{cardsRemaining !== 1 ? 's' : ''} remaining
        </Text>
      </View>
      <Text style={{ color: colors['foreground_subtle'] as string, fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
        {fmtCost(totalCost)}{totalSpend !== null ? ` (${fmtCost(totalSpend)})` : ''}
      </Text>
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <GlassView
        glassEffectStyle={hasContentBelow ? 'regular' : 'none'}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, paddingTop: insetTop }}
      >
        {inner}
        {hasContentBelow && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(128,128,128,0.15)' }} />}
      </GlassView>
    );
  }

  const bg = colors['background'] as string;
  const solidHeight = insetTop + TOPBAR_HEIGHT;
  const totalHeight = solidHeight + 32;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
      {hasContentBelow && (
        <LinearGradient
          colors={[bg, bg, bg + '00'] as any}
          locations={[0, solidHeight / totalHeight, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: totalHeight }}
        />
      )}
      <View style={{ paddingTop: insetTop }}>{inner}</View>
    </View>
  );
}

// ─── Route entry point ──────────────────────────────────────────────────────

export default function Session() {
  const params = useLocalSearchParams<{
    topic?: string; language?: string; count?: string; nodeId?: string; studyMode?: 'scheduled' | 'early'; deckIds?: string;
  }>();

  if (params.nodeId) {
    const selectedDeckIds = params.deckIds
      ? String(params.deckIds).split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    const studyMode = params.studyMode === 'early' ? 'early' : 'scheduled';
    return <DeckSession nodeId={params.nodeId} selectedDeckIds={selectedDeckIds} studyMode={studyMode} />;
  }

  return (
    <QuickSession
      topic={params.topic!}
      language={params.language!}
      cardCount={parseInt(params.count ?? '0', 10)}
    />
  );
}

// ─── Quick study (one-off, old flow) ────────────────────────────────────────

function QuickSession({ topic, language, cardCount }: { topic: string; language: string; cardCount: number }) {
  const loader = useSessionLoader({ topic, language, cardCount });

  return (
    <SessionUI
      loading={loader.loading}
      loadPhase={loader.loadPhase}
      loadError={loader.loadError}
      setLoadError={loader.setLoadError}
      cards={loader.cards}
      setCards={loader.setCards}
      totalCost={loader.totalCost}
      addCost={loader.addCost}
      explanation={loader.explanation}
      wasTruncated={loader.explanationTruncated}
      topic={topic}
      language={language}
      showExplanationOverlay
      markStudied={async () => {}}
    />
  );
}

// ─── Deck / collection study ────────────────────────────────────────────────

function DeckSession({
  nodeId,
  selectedDeckIds,
  studyMode,
}: {
  nodeId: string;
  selectedDeckIds?: string[];
  studyMode: 'scheduled' | 'early';
}) {
  const multi = useMultiDeckSession({ nodeId, selectedDeckIds });
  const [language, setLanguage] = useState('');

  // Get language from first deck
  useEffect(() => {
    if (multi.decks.size > 0 && !language) {
      const firstId = multi.decks.keys().next().value;
      if (firstId) {
        import('@/lib/api').then(({ getDeck }) => {
          getDeck(firstId).then(d => { if (d) setLanguage(d.language); });
        });
      }
    }
  }, [multi.decks, language]);

  // Derive current card's explanation — while loading, show first deck's explanation
  const currentDeckId = multi.cards.length > 0 ? multi.cards[0].deckId : null;
  const currentDeck: DeckInfo | undefined = currentDeckId ? multi.decks.get(currentDeckId) : undefined;
  const firstDeck: DeckInfo | undefined = multi.decks.size > 0
    ? multi.decks.values().next().value
    : undefined;
  const displayDeck = currentDeck ?? firstDeck;

  const overlayDecks: OverlayDeck[] = Array.from(multi.decks.entries()).map(([, info]) => ({
    topic: info.topic,
    deckName: info.deckName,
    explanation: info.explanation,
    wasTruncated: info.wasTruncated,
  }));

  return (
    <SessionUI
      loading={multi.loading}
      loadPhase="cards"
      loadError={multi.loadError}
      setLoadError={multi.setLoadError}
      cards={multi.cards}
      setCards={multi.setCards}
      totalCost={multi.totalCost}
      addCost={multi.addCost}
      explanation={displayDeck?.explanation ?? ''}
      wasTruncated={displayDeck?.wasTruncated ?? false}
      topic={displayDeck?.topic ?? ''}
      language={language}
      showExplanationOverlay
      markStudied={multi.markStudied}
      deckName={displayDeck?.deckName}
      overlayDecks={overlayDecks}
      decks={multi.decks}
      studyMode={studyMode}
    />
  );
}

// ─── Shared session UI ──────────────────────────────────────────────────────

interface SessionUIProps {
  loading: boolean;
  loadPhase: 'explanation' | 'cards';
  loadError: string | null;
  setLoadError: (e: string | null) => void;
  cards: (Card | DeckCard)[];
  setCards: (fn: any) => void;
  totalCost: number;
  addCost: (usd: number) => void;
  explanation: string;
  wasTruncated: boolean;
  topic: string;
  language: string;
  showExplanationOverlay: boolean;
  markStudied: () => Promise<void>;
  deckName?: string;
  overlayDecks?: OverlayDeck[];
  decks?: Map<string, DeckInfo>;
  studyMode?: 'scheduled' | 'early';
}

function SessionUI({
  loading, loadPhase, loadError, setLoadError,
  cards, setCards, totalCost, addCost,
  explanation, wasTruncated, topic, language,
  showExplanationOverlay, markStudied, deckName, overlayDecks, decks, studyMode = 'scheduled',
}: SessionUIProps) {
  const router = useRouter();
  const { isSmallScreen } = useScreenSize();
  const insets = useSafeAreaInsets();

  const [showOverlay, setShowOverlay] = useState(showExplanationOverlay);
  const [panelNarrowed, setPanelNarrowed] = useState(false);
  const [hasContentBelow, setHasContentBelow] = useState(false);
  const [beginningTotalSpend, setBeginningTotalSpend] = useState<number | null>(null);
  const beginningSessionCostRef = useRef<number | null>(null);
  const [cardPhase, setCardPhase] = useState<CardPhase>('input');
  const [answer, setAnswer] = useState('');
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [wrongExplanation, setWrongExplanation] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStreaming, setChatStreaming] = useState(false);
  const [vocabHintDismissSignal, setVocabHintDismissSignal] = useState(0);
  const [judgeWithExplanation, setJudgeWithExplanation] = useState(true);
  const [feedbackBrevity, setFeedbackBrevity] = useState<'brief' | 'normal'>('normal');
  const studiedRef = useRef(false);
  const [completedCards, setCompletedCards] = useState<CardAttempt[]>([]);
  // Keyed by card.id so wrong answers are tracked per card, not per position in queue.
  const cardWrongAnswers = useRef<Map<string, string[]>>(new Map());
  const hintCache = useRef<Map<string, WordHint>>(new Map());

  const inputRef = useRef<TextInput>(null);

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/home');
  }

  // Fetch judge_with_explanation + feedback_brevity settings + total spend baseline
  useEffect(() => {
    getSetting('judge_with_explanation').then(v => {
      if (v === 'off') setJudgeWithExplanation(false);
    });
    getSetting('feedback_brevity').then(v => {
      if (v === 'brief') setFeedbackBrevity('brief');
    });
    getUsageStatus().then(status => {
      const total = status.usage.central + status.usage.own;
      setBeginningTotalSpend(total);
      beginningSessionCostRef.current = total;
    }).catch(() => {});
  }, []);

  // Focus input when card phase resets
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
      const result = await judgeAnswer(current, trimmed, language, judgeWithExplanation ? explanation : undefined, feedbackBrevity);
      if (result.cost) addCost(result.cost);
      console.log(`[judge] correct=${result.correct} reason="${result.reason}"`);

      if (result.correct) {
        setFeedback(result.reason);
        setCardPhase('correct');
      } else {
        setCardPhase('wrong_explaining');
        const rejection = await explainRejection(current, trimmed, language, explanation, feedbackBrevity);
        if (rejection.cost) addCost(rejection.cost);
        console.log(`[rejection] overrideToCorrect=${rejection.overrideToCorrect}`);
        if (rejection.overrideToCorrect) {
          setFeedback(rejection.explanation);
          setCardPhase('correct');
        } else {
          setWrongExplanation(rejection.explanation);
          setCardPhase('wrong_shown');
        }
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
    }, 420);
  }

  const handleConfirmCorrect = useCallback(() => {
    const current = cards[0];
    const prevAnswers = cardWrongAnswers.current.get(current.id) ?? [];
    const answers = [...prevAnswers, submittedAnswer];  // append the final correct answer
    cardWrongAnswers.current.delete(current.id);
    setCompletedCards(prev => [...prev, {
      card: current,
      answers,
      deckId: (current as DeckCard).deckId,
    }]);
    setCards((prev: any[]) => prev.slice(1));
    setAnswer('');
    setFeedback('');
    setShowHint(false);
    setChatMessages([]);
    setChatStreaming(false);
    setCardPhase('input');
  }, [cards, submittedAnswer, setCards]);

  const handleConfirmWrong = useCallback(() => {
    const current = cards[0];
    const prev = cardWrongAnswers.current.get(current.id) ?? [];
    cardWrongAnswers.current.set(current.id, [...prev, submittedAnswer]);
    setCards((prev: any[]) => [...prev.slice(1), prev[0]]);
    setAnswer('');
    setWrongExplanation('');
    setShowHint(false);
    setChatMessages([]);
    setChatStreaming(false);
    setCardPhase('input');
  }, [cards, submittedAnswer, setCards]);

  // Enter key advances past judgment screens
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (cardPhase !== 'correct' && cardPhase !== 'wrong_shown') return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        const tag = (document.activeElement as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        if (cardPhase === 'correct') handleConfirmCorrect();
        else handleConfirmWrong();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cardPhase, handleConfirmCorrect, handleConfirmWrong]);

  async function handleChatSend(text: string) {
    const currentCard = cards[0];
    if (!currentCard || chatStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };

    setChatMessages(prev => [...prev, userMsg, assistantMsg]);
    setChatStreaming(true);

    const apiMessages = [...chatMessages, userMsg].map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    try {
      await chatAboutCard(
        currentCard,
        submittedAnswer,
        language,
        cardPhase === 'correct',
        apiMessages,
        (chunk) => {
          setChatMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
            return updated;
          });
        },
        addCost,
        explanation,
      );
    } catch {
      setChatMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        };
        return updated;
      });
    } finally {
      setChatStreaming(false);
    }
  }

  // ── Render: error ──────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8 gap-4" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Text className="text-error text-base text-center">{loadError}</Text>
        <TouchableOpacity className="bg-surface rounded-xl px-6 py-3" onPress={handleBack}>
          <Text className="text-foreground font-semibold">← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: loading (deck/collection mode, no overlay) ─────────────────────

  if (loading && !showOverlay) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8 gap-4" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-foreground-secondary text-base">Generating flashcards…</Text>
      </View>
    );
  }

  // ── Render: done ───────────────────────────────────────────────────────────

  if (!loading && cards.length === 0) {
    if (!studiedRef.current) {
      studiedRef.current = true;
      // For quick study sessions (no deck), still mark studied.
      // For deck sessions, the review endpoint handles lastStudiedAt.
      if (!decks || decks.size === 0) markStudied();
    }

    return (
      <SessionCompleteScreen
        completedCards={completedCards}
        decks={decks ?? new Map()}
        studyMode={studyMode}
        onDone={() => router.replace('/home')}
      />
    );
  }

  // ── Shared flashcard deck props ────────────────────────────────────────────

  const computedTotalSpend = beginningTotalSpend !== null
    ? totalCost + beginningTotalSpend - (beginningSessionCostRef.current ?? 0)
    : null;

  const deckProps = {
    cards, language, cardPhase,
    answer, onChangeAnswer: setAnswer, submittedAnswer,
    feedback, wrongExplanation,
    showHint, onToggleHint: () => setShowHint(true),
    onSubmitAnswer: handleSubmitAnswer,
    onConfirmCorrect: handleConfirmCorrect,
    onConfirmWrong: handleConfirmWrong,
    inputRef,
    chatMessages,
    chatStreaming,
    onChatSend: handleChatSend,
    deckName,
    hintCache,
    addCost,
    vocabHintDismissSignal,
  };

  // ── Render: session ────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-background">
      {isSmallScreen ? (
        showOverlay ? (
          <ExplanationOverlay
            topic={topic} explanation={explanation} wasTruncated={wasTruncated}
            loading={loading} loadPhase={loadPhase}
            onStart={() => setShowOverlay(false)} onBack={handleBack} insets={insets}
            allDecks={overlayDecks}
          />
        ) : (
          <KeyboardAvoidingView
            className="flex-1"
            behavior="height"
            enabled={Platform.OS !== 'ios'}
            onTouchStart={() => setVocabHintDismissSignal(prev => prev + 1)}
          >
            <SessionTopBar
              cardsRemaining={cards.length}
              totalCost={totalCost}
              totalSpend={computedTotalSpend}
              onBack={handleBack}
              hasContentBelow={hasContentBelow}
              insetTop={insets.top}
            />
            <ScrollView
              className="flex-1"
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              onScroll={e => {
                const y = e.nativeEvent.contentOffset.y;
                const next = y > 4;
                if (next !== hasContentBelow) setHasContentBelow(next);
              }}
              contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: insets.top + TOPBAR_HEIGHT + 16, paddingBottom: PEEK_HEIGHT + insets.bottom + 32 }}
            >
              <FlashcardDeck {...deckProps} />
            </ScrollView>
          </KeyboardAvoidingView>
        )
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-1 flex-row bg-background">
            {!showOverlay ? (
                <SidePanel explanation={explanation} wasTruncated={wasTruncated} />
            ) : (
              <View style={[
                { overflow: 'hidden' as const },
                Platform.OS === 'web'
                  ? { transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', width: panelNarrowed ? SIDEBAR_INITIAL_WIDTH : '100%' } as any
                  : { width: panelNarrowed ? SIDEBAR_INITIAL_WIDTH : '100%' },
              ]}>
                <ExplanationOverlay
                  topic={topic} explanation={explanation} wasTruncated={wasTruncated}
                  loading={loading} loadPhase={loadPhase}
                  onStart={handleStartPractising} onBack={handleBack} insets={insets}
                  allDecks={overlayDecks}
                />
              </View>
            )}

            {(panelNarrowed || !showOverlay) && (
              <View style={[
                { flex: 1 },
                Platform.OS === 'web'
                  ? { opacity: showOverlay ? 0 : 1, transition: 'opacity 0.3s ease', pointerEvents: showOverlay ? 'none' : 'auto' } as any
                  : {},
              ]}>
                <ScrollView className="flex-1" contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1, paddingHorizontal: 32, paddingVertical: 40 }}>
                  <FlashcardDeck {...deckProps} />
                </ScrollView>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
      {isSmallScreen && !showOverlay && (
        <BottomSheet explanation={explanation} wasTruncated={wasTruncated} />
      )}

      {/* Back button + info strip (wide screens only) */}
      {!isSmallScreen && !showOverlay && (
        <>
          <TouchableOpacity
            onPress={handleBack}
            style={{ position: 'absolute', top: insets.top + 8, left: 16, zIndex: 50 }}
            className="w-10 h-10 items-center justify-center rounded-full bg-surface/80"
            activeOpacity={0.7}
          >
            <Text className="text-foreground text-base font-semibold">←</Text>
          </TouchableOpacity>
          <View style={{ position: 'absolute', top: insets.top + 8, right: 16, zIndex: 50, alignItems: 'flex-end', gap: 2 }}>
            <Text className="text-foreground-secondary text-sm">
              {cards.length} card{cards.length !== 1 ? 's' : ''} remaining
            </Text>
            <Text className="text-foreground-subtle text-xs font-mono">
              ${totalCost.toFixed(4)}{computedTotalSpend !== null ? ` ($${computedTotalSpend.toFixed(4)} total)` : ''}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
