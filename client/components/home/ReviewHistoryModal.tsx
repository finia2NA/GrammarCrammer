import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ActivityIndicator, Platform } from 'react-native';

import { PageSheetModal } from '@/components/PageSheetModal';
import { useColors } from '@/constants/theme';
import { getDeckReviews, getCollectionReviews, getGrammarCases } from '@/lib/api';
import type { DeckReviewRecord, CollectionReviewRecord, GrammarCaseSummary } from '@/lib/api';
import type { TreeNode } from '@/lib/types';
import { GrammarCaseDifficultyChart, IntervalChart } from './review-history/ReviewHistoryCharts';
import { ReviewHistoryStats } from './review-history/ReviewHistoryStats';
import { ReviewHistoryTable } from './review-history/ReviewHistoryTable';
import { ReviewScheduleSection } from './review-history/ReviewScheduleSection';

const clickOrTap = Platform.OS === 'web' ? 'Click' : 'Tap';

interface ReviewHistoryModalProps {
  visible: boolean;
  node: TreeNode | null;
  onClose: () => void;
  onStudyAnyway?: () => void;
  onStartNewDeck?: () => void;
  newDeckLimitReached?: boolean;
  showActions?: boolean;
  onScheduleChanged?: () => void;
}

export function ReviewHistoryModal({
  visible,
  node,
  onClose,
  onStudyAnyway,
  onStartNewDeck,
  newDeckLimitReached = false,
  showActions = false,
  onScheduleChanged,
}: ReviewHistoryModalProps) {
  const colors = useColors();
  const isCollection = node ? node.deck === null : false;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deckReviews, setDeckReviews] = useState<DeckReviewRecord[]>([]);
  const [collectionReviews, setCollectionReviews] = useState<CollectionReviewRecord[]>([]);
  const [collectionDecks, setCollectionDecks] = useState<{ id: string; name: string }[]>([]);
  const [grammarCases, setGrammarCases] = useState<GrammarCaseSummary[]>([]);

  const fetchReviews = useCallback((nodeId: string, initial: boolean) => {
    if (initial) { setLoading(true); setDeckReviews([]); setCollectionReviews([]); setCollectionDecks([]); setGrammarCases([]); }
    else setRefreshing(true);

    if (isCollection) {
      getCollectionReviews(nodeId).then(result => {
        setCollectionReviews(result.reviews);
        setCollectionDecks(result.decks);
      }).catch(() => { }).finally(() => { setLoading(false); setRefreshing(false); });
    } else {
      Promise.all([
        getDeckReviews(nodeId),
        getGrammarCases(nodeId, { ensure: false, sort: 'difficulty' }).catch(() => ({ cases: [] })),
      ]).then(([reviewResult, caseResult]) => {
        setDeckReviews(reviewResult.reviews);
        setGrammarCases(caseResult.cases);
      }).catch(() => { }).finally(() => { setLoading(false); setRefreshing(false); });
    }
  }, [isCollection]);

  useEffect(() => {
    if (!visible || !node) return;
    fetchReviews(node.id, true);
  }, [visible, node, fetchReviews]);

  const reloadReviews = () => { if (node) fetchReviews(node.id, false); };

  const reviews = isCollection ? collectionReviews : deckReviews;
  const studyReviews = useMemo(() => reviews.filter(r => r.eventType === 'review' || r.eventType == null), [reviews]);
  const chronological = useMemo(() => [...studyReviews].reverse(), [studyReviews]);
  const title = node ? (isCollection ? node.name : node.name) : 'Review History';

  return (
    <PageSheetModal
      visible={visible}
      title={title}
      cancelText="Close"
      onCancel={onClose}
    >
      {loading ? (
        <View className="items-center py-16">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          <ReviewHistoryStats
            node={node}
            isCollection={isCollection}
            reviews={studyReviews}
            collectionDecks={collectionDecks}
          />

          {!isCollection && node && (
            <ReviewScheduleSection
              node={node}
              onScheduleChanged={onScheduleChanged}
              onReviewsChanged={reloadReviews}
            />
          )}

          {chronological.length >= 2 && (
            <IntervalChart
              reviews={chronological}
              isCollection={isCollection}
              colors={colors}
            />
          )}

          {!isCollection && grammarCases.length > 0 && (
            <GrammarCaseDifficultyChart cases={grammarCases} colors={colors} />
          )}

          {reviews.length === 0 ? (
            <View className="items-center py-16 px-8">
              <Text className="text-foreground-secondary text-base text-center leading-6">
                No review history yet.
              </Text>
            </View>
          ) : (
            <ReviewHistoryTable
              reviews={reviews}
              isCollection={isCollection}
              refreshing={refreshing}
            />
          )}
        </>
      )}

      {showActions && (
        <View className="mt-6">
          {onStudyAnyway && (
            <Text className="text-foreground-secondary text-sm">
              This deck is not due yet.{' '}
              <Text className="text-primary font-semibold" onPress={onStudyAnyway}>{clickOrTap} here to study now</Text>
            </Text>
          )}
          {onStartNewDeck && (
            <Text className="text-foreground-secondary text-sm">
              {isCollection ? 'No decks in this collection are due.' : 'This deck has not been started yet.'}{' '}
              {newDeckLimitReached ? (
                <Text className="text-foreground-muted">Daily limit reached.</Text>
              ) : (
                <Text className="text-primary font-semibold" onPress={onStartNewDeck}>{clickOrTap} here to start a new deck now.</Text>
              )}
            </Text>
          )}
        </View>
      )}
    </PageSheetModal>
  );
}
