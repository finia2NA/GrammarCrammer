import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { rateSession, submitDeckReview } from '@/lib/api';
import type { CardAttempt } from '@/lib/types';

interface DeckRatingCardProps {
  nodeId: string;
  topic: string;
  language: string;
  cards: CardAttempt[];
  onComplete: () => void;
}

export function DeckRatingCard({ nodeId, topic, language, cards, onComplete }: DeckRatingCardProps) {
  const [aiStars, setAiStars] = useState<number | null>(null);
  const [userStars, setUserStars] = useState<number | null>(null);
  const [recap, setRecap] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingSubmit = useRef(false);

  useEffect(() => {
    let cancelled = false;
    rateSession(topic, language, cards)
      .then(result => {
        if (cancelled) return;
        setAiStars(result.stars);
        setUserStars(result.stars);
        setRecap(result.recap);
        setLoading(false);
        if (pendingSubmit.current) {
          handleSubmit(result.stars, result.stars, result.recap);
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to a neutral rating if AI fails
        setAiStars(3);
        setUserStars(3);
        setRecap('');
        setLoading(false);
        if (pendingSubmit.current) {
          handleSubmit(3, 3, '');
        }
      });
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(finalUserStars: number, finalAiStars: number, finalRecap: string) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitDeckReview(nodeId, finalUserStars, finalAiStars, finalRecap);
    } catch {
      setError('Could not save rating. Your progress is still recorded.');
    } finally {
      setSubmitting(false);
      onComplete();
    }
  }

  function handleDone() {
    if (loading) {
      pendingSubmit.current = true;
      return;
    }
    const finalStars = userStars ?? aiStars ?? 3;
    const finalAiStars = aiStars ?? 3;
    handleSubmit(finalStars, finalAiStars, recap);
  }

  const stars = userStars ?? aiStars ?? 3;

  return (
    <View className="bg-card rounded-3xl p-6 gap-4">
      <Text className="text-foreground font-semibold text-base">{topic}</Text>

      {loading ? (
        <View className="flex-row items-center gap-3 py-2">
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text className="text-foreground-secondary text-sm">AI is rating your session…</Text>
        </View>
      ) : (
        <>
          {recap.length > 0 && (
            <Text className="text-foreground-secondary text-sm leading-5">{recap}</Text>
          )}
        </>
      )}

      {error && (
        <Text className="text-error text-xs">{error}</Text>
      )}

      {/* Star selector */}
      <View className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n}
            onPress={() => setUserStars(n)}
            disabled={submitting}
            style={{ padding: 4 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 28, opacity: submitting ? 0.5 : 1 }}>
              {n <= stars ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        className="bg-primary rounded-2xl py-3 px-6 items-center"
        onPress={handleDone}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text className="text-primary-foreground font-bold text-base">
            {loading ? 'Done (loading…)' : 'Done'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
