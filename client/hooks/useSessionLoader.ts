import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getAuthToken } from '@/lib/storage';
import { generateExplanation, generateCards } from '@/lib/api';
import type { Card, LoadPhase } from '@/lib/types';

interface UseSessionLoaderParams {
  topic: string;
  language: string;
  cardCount: number;
  existingExplanation?: string;
}

export function useSessionLoader({ topic, language, cardCount, existingExplanation }: UseSessionLoaderParams) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadPhase, setLoadPhase] = useState<LoadPhase>('explanation');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState(existingExplanation ?? '');
  const [explanationTruncated, setExplanationTruncated] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  const addCost = (usd: number) => setTotalCost(prev => prev + usd);

  useEffect(() => {
    async function load() {
      try {
        const token = await getAuthToken();
        if (!token) { router.replace('/onboarding'); return; }

        let fullExplanation = existingExplanation ?? '';

        if (!existingExplanation) {
          const { wasTruncated } = await generateExplanation(
            topic, language,
            (chunk) => {
              fullExplanation += chunk;
              setExplanation(prev => prev + chunk);
            },
            addCost,
          );
          setExplanationTruncated(wasTruncated);
        }

        setLoadPhase('cards');
        const result = await generateCards(topic, language, cardCount, fullExplanation);
        if (result.cost) addCost(result.cost);
        setCards(result.cards);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to generate session.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cardCount, existingExplanation, language, router, topic]);

  return {
    loading,
    loadPhase,
    loadError,
    setLoadError,
    explanation,
    explanationTruncated,
    cards,
    setCards,
    totalCost,
    addCost,
  };
}
