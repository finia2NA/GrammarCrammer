import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { judgeAnswer, explainRejection, chatAboutCard } from '@/lib/claude';
import { CARD_CHAT_PROMPT } from '@/constants/prompts';
import type { Card, CardPhase, DeckCard, ChatMessage } from '@/lib/types';
import { useSessionLoader } from '@/hooks/useSessionLoader';
import { useMultiDeckSession } from '@/hooks/useMultiDeckSession';
import type { DeckInfo } from '@/hooks/useMultiDeckSession';
import {
  SidePanel,
  BottomSheet,
  ExplanationOverlay,
  FlashcardDeck,
  PEEK_HEIGHT,
} from '@/components/session';

const SIDEBAR_INITIAL_WIDTH = 320;

// ─── Route entry point ──────────────────────────────────────────────────────

export default function Session() {
  const params = useLocalSearchParams<{
    topic?: string; language?: string; count?: string; nodeId?: string;
  }>();

  if (params.nodeId) {
    return <DeckSession nodeId={params.nodeId} />;
  }

  return (
    <QuickSession
      topic={params.topic!}
      language={params.language!}
      cardCount={parseInt(params.count ?? '10', 10)}
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
      apiKeyRef={loader.apiKeyRef}
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

function DeckSession({ nodeId }: { nodeId: string }) {
  const multi = useMultiDeckSession({ nodeId });
  const [language, setLanguage] = useState('');

  // Get language from first deck
  useEffect(() => {
    if (multi.decks.size > 0 && !language) {
      const firstId = multi.decks.keys().next().value;
      if (firstId) {
        import('@/lib/deck-store').then(({ getDeck }) => {
          getDeck(firstId).then(d => { if (d) setLanguage(d.language); });
        });
      }
    }
  }, [multi.decks, language]);

  // Derive current card's explanation
  const currentDeckId = multi.cards.length > 0 ? multi.cards[0].deckId : null;
  const currentDeck: DeckInfo | undefined = currentDeckId ? multi.decks.get(currentDeckId) : undefined;

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
      apiKeyRef={multi.apiKeyRef}
      explanation={currentDeck?.explanation ?? ''}
      wasTruncated={currentDeck?.wasTruncated ?? false}
      topic={currentDeck?.topic ?? ''}
      language={language}
      showExplanationOverlay={false}
      markStudied={multi.markStudied}
      deckName={currentDeck?.deckName}
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
  apiKeyRef: React.MutableRefObject<string>;
  explanation: string;
  wasTruncated: boolean;
  topic: string;
  language: string;
  showExplanationOverlay: boolean;
  markStudied: () => Promise<void>;
  deckName?: string;
}

function SessionUI({
  loading, loadPhase, loadError, setLoadError,
  cards, setCards, totalCost, addCost, apiKeyRef,
  explanation, wasTruncated, topic, language,
  showExplanationOverlay, markStudied, deckName,
}: SessionUIProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallScreen = width < 768;

  const [showOverlay, setShowOverlay] = useState(showExplanationOverlay);
  const [panelNarrowed, setPanelNarrowed] = useState(false);
  const [cardPhase, setCardPhase] = useState<CardPhase>('input');
  const [answer, setAnswer] = useState('');
  const [submittedAnswer, setSubmittedAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [wrongExplanation, setWrongExplanation] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStreaming, setChatStreaming] = useState(false);
  const studiedRef = useRef(false);

  const inputRef = useRef<TextInput>(null);

  // Focus input when card phase resets
  useEffect(() => {
    if (cardPhase === 'input' && !showOverlay) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [cardPhase, showOverlay]);

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
  }, [cardPhase]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSubmitAnswer() {
    const trimmed = answer.trim();
    if (!trimmed || cardPhase !== 'input') return;

    const current = cards[0];
    setSubmittedAnswer(trimmed);
    setCardPhase('judging');

    try {
      const result = await judgeAnswer(apiKeyRef.current, current, trimmed, language, addCost);

      if (result.correct) {
        setFeedback(result.reason);
        setCardPhase('correct');
      } else {
        setCardPhase('wrong_explaining');
        setWrongExplanation('');
        let firstChunk = true;
        await explainRejection(
          apiKeyRef.current, current, trimmed, language,
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
    }, 420);
  }

  function handleConfirmCorrect() {
    setCards((prev: any[]) => prev.slice(1));
    setAnswer('');
    setFeedback('');
    setShowHint(false);
    setChatMessages([]);
    setChatStreaming(false);
    setCardPhase('input');
  }

  function handleConfirmWrong() {
    setCards((prev: any[]) => [...prev.slice(1), prev[0]]);
    setAnswer('');
    setWrongExplanation('');
    setShowHint(false);
    setChatMessages([]);
    setChatStreaming(false);
    setCardPhase('input');
  }

  async function handleChatSend(text: string) {
    const currentCard = cards[0];
    if (!currentCard || chatStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };

    setChatMessages(prev => [...prev, userMsg, assistantMsg]);
    setChatStreaming(true);

    const systemPrompt = CARD_CHAT_PROMPT(
      language,
      currentCard.english,
      currentCard.targetLanguage,
      submittedAnswer,
      cardPhase === 'correct',
      currentCard.sentenceContext,
    );

    const apiMessages = [...chatMessages, userMsg].map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    try {
      await chatAboutCard(
        apiKeyRef.current,
        systemPrompt,
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
      <View className="flex-1 bg-slate-950 items-center justify-center px-8 gap-4" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Text className="text-red-400 text-base text-center">{loadError}</Text>
        <TouchableOpacity className="bg-slate-800 rounded-xl px-6 py-3" onPress={() => router.back()}>
          <Text className="text-white font-semibold">← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render: loading (deck/collection mode, no overlay) ─────────────────────

  if (loading && !showOverlay) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center px-8 gap-4" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-slate-400 text-base">Generating flashcards…</Text>
      </View>
    );
  }

  // ── Render: done ───────────────────────────────────────────────────────────

  if (!loading && cards.length === 0) {
    if (!studiedRef.current) {
      studiedRef.current = true;
      markStudied();
    }

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
    cards, language, totalCost, cardPhase,
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
  };

  // ── Render: session ────────────────────────────────────────────────────────

  return (
    <View className="flex-1 bg-slate-950">
      {isSmallScreen ? (
        showOverlay ? (
          <ExplanationOverlay
            topic={topic} explanation={explanation} wasTruncated={wasTruncated}
            loading={loading} loadPhase={loadPhase}
            onStart={() => setShowOverlay(false)} insets={insets}
          />
        ) : (
          <View className="flex-1">
            <ScrollView className="flex-1" contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: insets.top + 32, paddingBottom: PEEK_HEIGHT + insets.bottom + 32 }}>
              <FlashcardDeck {...deckProps} onBack={() => router.back()} />
            </ScrollView>
          </View>
        )
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-1 flex-row bg-slate-950">
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
                  onStart={handleStartPractising} insets={insets}
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

      {/* Back button (wide screens only — small screens use inline back in FlashcardDeck) */}
      {!isSmallScreen && !showOverlay && (
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 16,
            zIndex: 50,
          }}
          className="w-10 h-10 items-center justify-center rounded-full bg-slate-800/80"
          activeOpacity={0.7}
        >
          <Text className="text-slate-300 text-base font-semibold">←</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
