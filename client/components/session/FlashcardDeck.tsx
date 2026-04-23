import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useColors } from '@/constants/theme';
import type { Card, CardPhase, ChatMessage } from '@/lib/types';
import { GrammarMarkdown } from './GrammarMarkdown';
import { CardChat } from './CardChat';

// ─── Small helpers ────────────────────────────────────────────────────────────

function AnswerBox({ answer }: { answer: string }) {
  return (
    <View className="bg-background-muted rounded-lg px-3 py-2 gap-1">
      <Text className="text-foreground-secondary text-xs">Your answer</Text>
      <Text className="text-foreground/70 text-sm">{answer}</Text>
    </View>
  );
}

function ExampleBox({ example }: { example: string }) {
  return (
    <View className="bg-background-warm rounded-lg px-3 py-2 gap-1">
      <Text className="text-foreground-secondary text-xs">My example sentence</Text>
      <Text className="text-foreground text-base font-medium">{example}</Text>
    </View>
  );
}

// ─── FlashcardDeck ────────────────────────────────────────────────────────────

interface FlashcardDeckProps {
  cards: Card[];
  language: string;
  totalCost: number;
  totalSpend: number | null;
  cardPhase: CardPhase;
  answer: string;
  onChangeAnswer: (text: string) => void;
  submittedAnswer: string;
  feedback: string;
  wrongExplanation: string;
  showHint: boolean;
  onToggleHint: () => void;
  onSubmitAnswer: () => void;
  onConfirmCorrect: () => void;
  onConfirmWrong: () => void;
  inputRef: React.RefObject<TextInput | null>;
  chatMessages: ChatMessage[];
  chatStreaming: boolean;
  onChatSend: (text: string) => void;
  deckName?: string;
  onBack?: () => void;
}

export function FlashcardDeck({
  cards, language, totalCost, totalSpend, cardPhase,
  answer, onChangeAnswer, submittedAnswer,
  feedback, wrongExplanation,
  showHint, onToggleHint,
  onSubmitAnswer, onConfirmCorrect, onConfirmWrong,
  inputRef, chatMessages, chatStreaming, onChatSend, deckName, onBack,
}: FlashcardDeckProps) {
  const colors = useColors();
  const currentCard = cards[0] ?? { english: '', targetLanguage: '', notes: '', sentenceContext: '' };

  return (
    <>
      {/* Progress + cost */}
      <View className="flex-row justify-between items-center w-full max-w-xl mb-6">
        <View className="flex-row items-center gap-3">
          {onBack && (
            <TouchableOpacity onPress={onBack} activeOpacity={0.7} className="w-8 h-8 items-center justify-center rounded-full bg-background-muted border border-border">
              <Text className="text-foreground/70 text-sm font-semibold">←</Text>
            </TouchableOpacity>
          )}
          <Text className="text-foreground-secondary text-sm">
            {cards.length} card{cards.length !== 1 ? 's' : ''} remaining
          </Text>
        </View>
        <Text className="text-foreground-secondary/60 text-xs font-mono">
          ${totalCost.toFixed(4)}
          {totalSpend !== null && (
            <Text className="text-foreground-secondary/40"> (${totalSpend.toFixed(4)} total)</Text>
          )}
        </Text>
      </View>

      {/* Card */}
      <View className="w-full max-w-xl bg-surface rounded-3xl p-8 mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-foreground-secondary text-xs uppercase tracking-widest">Translate to {language}</Text>
          {deckName ? <Text className="text-foreground-secondary text-xs">{deckName}</Text> : null}
        </View>
        <Text className="text-foreground text-xl font-semibold leading-8 mb-2">
          {currentCard.english}
        </Text>
        {currentCard.sentenceContext && (
          <View className="self-end bg-background-muted border border-border rounded-md px-2 py-0.5 mb-4">
            <Text className="text-primary/70 text-xs font-medium">{currentCard.sentenceContext}</Text>
          </View>
        )}

        {/* Input phase */}
        {(cardPhase === 'input' || cardPhase === 'judging') && (
          <>
            <TextInput
              ref={inputRef}
              className="bg-background-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-muted text-base mb-4"
              placeholder="Your translation…"
              placeholderTextColor={colors.foreground_muted}
              value={answer}
              onChangeText={onChangeAnswer}
              onSubmitEditing={onSubmitAnswer}
              editable={cardPhase === 'input'}
              autoFocus
            />
            <TouchableOpacity
              className={`py-3.5 rounded-xl items-center mb-3 ${cardPhase === 'judging' ? 'bg-background-muted' : 'bg-primary'
                }`}
              onPress={onSubmitAnswer}
              disabled={cardPhase === 'judging'}
            >
              {cardPhase === 'judging' ? (
                <ActivityIndicator color={colors.foreground} />
              ) : (
                <Text className="text-primary-foreground font-semibold">Check answer</Text>
              )}
            </TouchableOpacity>

            {/* Hint */}
            {currentCard.notes && (
              showHint ? (
                <View className="bg-background-muted rounded-lg px-3 py-2">
                  <Text className="text-foreground-secondary text-xs">{currentCard.notes}</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={onToggleHint}>
                  <Text className="text-foreground-secondary/50 text-xs text-center">Show hint</Text>
                </TouchableOpacity>
              )
            )}
          </>
        )}

        {/* Correct */}
        {cardPhase === 'correct' && (
          <View className="gap-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-success text-lg">✓</Text>
              <Text className="text-success font-semibold">Correct!</Text>
            </View>
            <AnswerBox answer={submittedAnswer} />
            <GrammarMarkdown>{feedback}</GrammarMarkdown>
            <ExampleBox example={currentCard.targetLanguage} />
            <TouchableOpacity
              className="bg-success rounded-xl py-3.5 items-center mt-2"
              onPress={onConfirmCorrect}
            >
              <Text className="text-primary-foreground font-semibold">Next card →</Text>
            </TouchableOpacity>
            <CardChat messages={chatMessages} streaming={chatStreaming} onSend={onChatSend} />
          </View>
        )}

        {/* Wrong — explaining */}
        {cardPhase === 'wrong_explaining' && (
          <View className="items-center gap-3 py-2">
            <ActivityIndicator color={colors.error} />
            <Text className="text-foreground-secondary text-sm">Getting feedback…</Text>
          </View>
        )}

        {/* Wrong — shown */}
        {cardPhase === 'wrong_shown' && (
          <View className="gap-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Text className="text-error text-lg">✗</Text>
              <Text className="text-error font-semibold">Not quite</Text>
            </View>
            <AnswerBox answer={submittedAnswer} />
            <ExampleBox example={currentCard.targetLanguage} />
            <GrammarMarkdown>{wrongExplanation}</GrammarMarkdown>
            <TouchableOpacity
              className="bg-primary rounded-xl py-3.5 items-center mt-2"
              onPress={onConfirmWrong}
            >
              <Text className="text-primary-foreground font-semibold">Try again later →</Text>
            </TouchableOpacity>
            <CardChat messages={chatMessages} streaming={chatStreaming} onSend={onChatSend} />
          </View>
        )}
      </View>
    </>
  );
}
