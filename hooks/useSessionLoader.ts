import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { getApiKey } from '@/lib/storage';
import { generateExplanation, generateCards } from '@/lib/claude';
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

  const apiKeyRef = useRef<string>('');
  const addCost = (usd: number) => setTotalCost(prev => prev + usd);

  useEffect(() => {
    async function load() {
      try {
        const key = await getApiKey();
        if (!key) { router.replace('/onboarding'); return; }
        apiKeyRef.current = key;

        let fullExplanation = existingExplanation ?? '';

        if (!existingExplanation) {
          const { wasTruncated } = await generateExplanation(
            key, topic, language,
            (chunk) => {
              fullExplanation += chunk;
              setExplanation(prev => prev + chunk);
            },
            addCost,
          );
          setExplanationTruncated(wasTruncated);
        }

        setLoadPhase('cards');
        const generatedCards = await generateCards(
          key, topic, language, cardCount, fullExplanation, addCost,
        );
        setCards(generatedCards);
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
    apiKeyRef,
  };
}
