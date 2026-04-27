import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CardAttempt } from '@/lib/types';
import type { DeckInfo } from '@/hooks/useMultiDeckSession';
import { DeckRatingCard } from './DeckRatingCard';

interface SessionCompleteScreenProps {
  completedCards: CardAttempt[];
  decks: Map<string, DeckInfo>;
  onDone: () => void;
}

function AttemptRow({ attempt }: { attempt: CardAttempt }) {
  const wrongAnswers = attempt.answers.slice(0, -1);
  const correctAnswer = attempt.answers[attempt.answers.length - 1];
  return (
    <View className="gap-1 py-3 border-b border-foreground/10">
      <Text className="text-foreground text-sm font-medium">{attempt.card.english}</Text>
      {wrongAnswers.map((wrong, i) => (
        <Text key={i} className="text-error text-xs ml-2">✗ {wrong}</Text>
      ))}
      <Text className="text-success text-xs ml-2">✓ {correctAnswer}</Text>
    </View>
  );
}

export function SessionCompleteScreen({ completedCards, decks, onDone }: SessionCompleteScreenProps) {
  const insets = useSafeAreaInsets();

  // Group cards by deckId (undefined = quick study)
  const deckGroups = new Map<string | undefined, CardAttempt[]>();
  for (const attempt of completedCards) {
    const key = attempt.deckId;
    if (!deckGroups.has(key)) deckGroups.set(key, []);
    deckGroups.get(key)!.push(attempt);
  }

  const isQuickStudy = deckGroups.size === 1 && deckGroups.has(undefined);
  const deckGroupEntries = Array.from(deckGroups.entries()).filter(([k]) => k !== undefined) as [string, CardAttempt[]][];
  const quickCards = deckGroups.get(undefined) ?? [];

  // Track which decks have had their rating submitted
  const [completedDeckIds, setCompletedDeckIds] = useState<Set<string>>(new Set());
  const allRatingsSubmitted = isQuickStudy || deckGroupEntries.every(([id]) => completedDeckIds.has(id));

  function handleDeckComplete(nodeId: string) {
    setCompletedDeckIds(prev => new Set(prev).add(nodeId));
  }

  const totalCards = completedCards.length;
  const firstTryCorrect = completedCards.filter(a => a.answers.length === 1).length;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center gap-2 py-4">
          <Text className="text-5xl">🎉</Text>
          <Text className="text-foreground text-2xl font-bold">Session complete!</Text>
          <Text className="text-foreground-secondary text-sm text-center">
            {firstTryCorrect}/{totalCards} cards correct on first try
          </Text>
        </View>

        {/* Quick study cards (no deck) */}
        {quickCards.length > 0 && (
          <View className="bg-card rounded-3xl p-6 gap-1">
            <Text className="text-foreground font-semibold text-base mb-2">Cards reviewed</Text>
            {quickCards.map((a, i) => <AttemptRow key={i} attempt={a} />)}
          </View>
        )}

        {/* Per-deck sections */}
        {deckGroupEntries.map(([deckId, deckCards]) => {
          const info = decks.get(deckId);
          return (
            <View key={deckId} className="gap-3">
              {/* Cards for this deck */}
              <View className="bg-card rounded-3xl p-6 gap-1">
                <Text className="text-foreground font-semibold text-base mb-2">
                  {info?.deckName ?? 'Deck'}
                </Text>
                {deckCards.map((a, i) => <AttemptRow key={i} attempt={a} />)}
              </View>

              {/* Rating card for this deck */}
              {info && !completedDeckIds.has(deckId) && (
                <DeckRatingCard
                  nodeId={deckId}
                  topic={info.topic}
                  language={info.language}
                  cards={deckCards}
                  onComplete={() => handleDeckComplete(deckId)}
                />
              )}
              {completedDeckIds.has(deckId) && (
                <View className="bg-card rounded-3xl p-4 items-center">
                  <Text className="text-foreground-secondary text-sm">Rating saved ✓</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Done button — shown once all deck ratings are submitted (or immediately for quick study) */}
        {allRatingsSubmitted && (
          <TouchableOpacity
            className="bg-primary rounded-2xl py-4 items-center"
            onPress={onDone}
            activeOpacity={0.8}
          >
            <Text className="text-primary-foreground font-bold text-base">Back to home</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
