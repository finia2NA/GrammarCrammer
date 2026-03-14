import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { getApiKey } from '@/lib/storage';
import { generateCards } from '@/lib/claude';
import { getDeck, getDescendantDeckIds, getSetting, setLastStudied } from '@/lib/deck-store';
import type { Card, DeckCard, DeckData } from '@/lib/types';

interface UseMultiDeckSessionParams {
  nodeId: string;
}

export interface DeckInfo {
  explanation: string;
  wasTruncated: boolean;
  topic: string;
  deckName: string;
}

export function useMultiDeckSession({ nodeId }: UseMultiDeckSessionParams) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [decks, setDecks] = useState<Map<string, DeckInfo>>(new Map());
  const [totalCost, setTotalCost] = useState(0);
  const [deckIds, setDeckIds] = useState<string[]>([]);

  const apiKeyRef = useRef<string>('');
  const addCost = (usd: number) => setTotalCost(prev => prev + usd);

  useEffect(() => {
    async function load() {
      try {
        const key = await getApiKey();
        if (!key) { router.replace('/onboarding'); return; }
        apiKeyRef.current = key;

        // Resolve nodeId to deck IDs
        const ids = await getDescendantDeckIds(nodeId);
        if (ids.length === 0) {
          setLoadError('No decks found for this item.');
          setLoading(false);
          return;
        }
        setDeckIds(ids);

        // Load all deck data
        const deckDataList: (DeckData & { id: string })[] = [];
        for (const id of ids) {
          const d = await getDeck(id);
          if (!d || d.explanationStatus !== 'ready' || !d.explanation) continue;
          deckDataList.push({ ...d, id });
        }

        if (deckDataList.length === 0) {
          setLoadError('No decks have finished generating their explanations yet.');
          setLoading(false);
          return;
        }

        // Build deck info map
        const infoMap = new Map<string, DeckInfo>();
        for (const d of deckDataList) {
          infoMap.set(d.id, {
            explanation: d.explanation!,
            wasTruncated: false,
            topic: d.topic,
            deckName: d.topic, // use topic as display name for the panel
          });
        }
        setDecks(infoMap);

        // Generate cards for all decks in parallel
        const cardArrays = await Promise.all(
          deckDataList.map(async (d) => {
            const rawCards = await generateCards(
              key, d.topic, d.language, d.cardCount, d.explanation!, addCost,
            );
            return rawCards.map((c): DeckCard => ({ ...c, deckId: d.id }));
          }),
        );

        // Flatten and order
        let allCards = cardArrays.flat();
        const cardOrder = await getSetting('card_order') ?? 'shuffled';

        if (cardOrder === 'shuffled') {
          // Fisher-Yates shuffle
          for (let i = allCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
          }
        }
        // 'sequential' = already in order (deck by deck)

        // Re-index IDs to be unique across all decks
        allCards = allCards.map((c, i) => ({ ...c, id: String(i) }));

        setCards(allCards);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to generate session.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [nodeId, router]);

  /** Mark all studied decks as last studied. */
  async function markStudied() {
    for (const id of deckIds) {
      await setLastStudied(id);
    }
  }

  return {
    loading,
    loadError,
    setLoadError,
    cards,
    setCards,
    decks,
    totalCost,
    addCost,
    apiKeyRef,
    markStudied,
  };
}
