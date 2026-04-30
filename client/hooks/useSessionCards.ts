import { useState, useEffect, useRef, useCallback } from 'react';
import { TextInput, Platform } from 'react-native';
import { judgeAnswer, explainRejection, chatAboutCard, getSetting, getUsageStatus } from '@/lib/api';
import type { Card, CardPhase, DeckCard, ChatMessage, CardAttempt, WordHint } from '@/lib/types';

interface UseSessionCardsParams {
  cards: (Card | DeckCard)[];
  setCards: (fn: any) => void;
  language: string;
  explanation: string;
  addCost: (usd: number) => void;
  setLoadError: (e: string | null) => void;
  showOverlay: boolean;
}

export function useSessionCards({
  cards, setCards, language, explanation, addCost, setLoadError, showOverlay,
}: UseSessionCardsParams) {
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
  const [completedCards, setCompletedCards] = useState<CardAttempt[]>([]);
  const [beginningTotalSpend, setBeginningTotalSpend] = useState<number | null>(null);
  const beginningSessionCostRef = useRef<number | null>(null);
  const cardWrongAnswers = useRef<Map<string, string[]>>(new Map());
  const hintCache = useRef<Map<string, WordHint>>(new Map());
  const inputRef = useRef<TextInput>(null);

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

  useEffect(() => {
    if (cardPhase === 'input' && !showOverlay) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [cardPhase, showOverlay]);

  async function handleSubmitAnswer() {
    const trimmed = answer.trim();
    if (!trimmed || cardPhase !== 'input') return;

    const current = cards[0];
    setSubmittedAnswer(trimmed);
    setCardPhase('judging');

    try {
      const result = await judgeAnswer(current, trimmed, language, judgeWithExplanation ? explanation : undefined, feedbackBrevity);
      if (result.cost) addCost(result.cost);

      if (result.correct) {
        setFeedback(result.reason);
        setCardPhase('correct');
      } else {
        setCardPhase('wrong_explaining');
        const rejection = await explainRejection(current, trimmed, language, explanation, feedbackBrevity);
        if (rejection.cost) addCost(rejection.cost);
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

  const handleConfirmCorrect = useCallback(() => {
    const current = cards[0];
    const prevAnswers = cardWrongAnswers.current.get(current.id) ?? [];
    const answers = [...prevAnswers, submittedAnswer];
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
        currentCard, submittedAnswer, language,
        cardPhase === 'correct', apiMessages,
        (chunk) => {
          setChatMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
            return updated;
          });
        },
        addCost, explanation,
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

  return {
    cardPhase, answer, setAnswer, submittedAnswer,
    feedback, wrongExplanation, showHint,
    chatMessages, chatStreaming, vocabHintDismissSignal, setVocabHintDismissSignal,
    completedCards, beginningTotalSpend, beginningSessionCostRef,
    hintCache, inputRef,
    handleSubmitAnswer, handleConfirmCorrect, handleConfirmWrong, handleChatSend,
    toggleHint: () => setShowHint(true),
  };
}
