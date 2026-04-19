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
    <View className="bg-input rounded-lg px-3 py-2 gap-1">
      <Text className="text-muted-foreground text-xs">Your answer</Text>
      <Text className="text-foreground/70 text-sm">{answer}</Text>
    </View>
  );
}

function ExampleBox({ example }: { example: string }) {
  return (
    <View className="bg-input rounded-lg px-3 py-2 gap-1">
      <Text className="text-muted-foreground text-xs">My example sentence</Text>
      <Text className="text-foreground text-base font-medium">{example}</Text>
    </View>
  );
}

// ─── FlashcardDeck ────────────────────────────────────────────────────────────

interface FlashcardDeckProps {
  cards: Card[];
  language: string;
  totalCost: number;
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
  cards, language, totalCost, cardPhase,
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
            <TouchableOpacity onPress={onBack} activeOpacity={0.7} className="w-8 h-8 items-center justify-center rounded-full bg-input border border-border">
              <Text className="text-foreground/70 text-sm font-semibold">←</Text>
            </TouchableOpacity>
          )}
          <Text className="text-muted-foreground text-sm">
            {cards.length} card{cards.length !== 1 ? 's' : ''} remaining
          </Text>
        </View>
        <Text className="text-muted-foreground/60 text-xs font-mono">
          ${totalCost.toFixed(4)}
        </Text>
      </View>

      {/* Card */}
      <View className="w-full max-w-xl bg-card rounded-3xl p-8 mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-muted-foreground text-xs uppercase tracking-widest">Translate to {language}</Text>
          {deckName ? <Text className="text-muted-foreground text-xs">{deckName}</Text> : null}
        </View>
        <Text className="text-foreground text-xl font-semibold leading-8 mb-2">
          {currentCard.english}
        </Text>
        {currentCard.sentenceContext && (
          <View className="self-end bg-amber-950 border border-amber-700 rounded-md px-2 py-0.5 mb-4">
            <Text className="text-amber-300 text-xs font-medium">{currentCard.sentenceContext}</Text>
          </View>
        )}

        {/* Input phase */}
        {(cardPhase === 'input' || cardPhase === 'judging') && (
          <>
            <TextInput
              ref={inputRef}
              className="bg-input border border-border rounded-xl px-4 py-3 text-foreground text-base mb-4"
              placeholder="Your translation…"
              placeholderTextColor={colors.border}
              value={answer}
              onChangeText={onChangeAnswer}
              onSubmitEditing={onSubmitAnswer}
              editable={cardPhase === 'input'}
              autoFocus
            />
            <TouchableOpacity
              className={`py-3.5 rounded-xl items-center mb-3 ${
                cardPhase === 'judging' ? 'bg-muted' : 'bg-primary'
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
                <View className="bg-input rounded-lg px-3 py-2">
                  <Text className="text-muted-foreground text-xs">{currentCard.notes}</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={onToggleHint}>
                  <Text className="text-muted-foreground/50 text-xs text-center">Show hint</Text>
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
            <Text className="text-foreground/70 text-sm leading-6">{feedback}</Text>
            <ExampleBox example={currentCard.targetLanguage} />
            <TouchableOpacity
              className="bg-green-700 rounded-xl py-3.5 items-center mt-2"
              onPress={onConfirmCorrect}
            >
              <Text className="text-white font-semibold">Next card →</Text>
            </TouchableOpacity>
            <CardChat messages={chatMessages} streaming={chatStreaming} onSend={onChatSend} />
          </View>
        )}

        {/* Wrong — explaining */}
        {cardPhase === 'wrong_explaining' && (
          <View className="items-center gap-3 py-2">
            <ActivityIndicator color={colors.destructive} />
            <Text className="text-muted-foreground text-sm">Getting feedback…</Text>
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
            <GrammarMarkdown>{wrongExplanation}</GrammarMarkdown>
            <TouchableOpacity
              className="bg-amber-700 rounded-xl py-3.5 items-center mt-2"
              onPress={onConfirmWrong}
            >
              <Text className="text-white font-semibold">Try again later →</Text>
            </TouchableOpacity>
            <CardChat messages={chatMessages} streaming={chatStreaming} onSend={onChatSend} />
          </View>
        )}
      </View>
    </>
  );
}
