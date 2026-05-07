import { View, Text } from 'react-native';

import type { CollectionReviewRecord, DeckReviewRecord } from '@/lib/api';
import type { TreeNode } from '@/lib/types';

interface ReviewHistoryStatsProps {
  node: TreeNode | null;
  isCollection: boolean;
  reviews: (DeckReviewRecord | CollectionReviewRecord)[];
  collectionDecks: { id: string; name: string }[];
}

export function ReviewHistoryStats({
  node,
  isCollection,
  reviews,
  collectionDecks,
}: ReviewHistoryStatsProps) {
  if (!node) return null;

  const totalReviews = reviews.length;
  const avgStars = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.userStars, 0) / totalReviews).toFixed(1)
    : '-';

  if (isCollection) {
    return (
      <View className="bg-surface border border-border rounded-2xl p-4 mb-4 gap-2">
        <View className="flex-row justify-between">
          <StatItem label="Decks" value={String(collectionDecks.length)} />
          <StatItem label="Reviews" value={String(totalReviews)} />
          <StatItem label="Avg Stars" value={avgStars} />
        </View>
      </View>
    );
  }

  const deck = node.deck;
  const dueLabel = deck?.dueAt
    ? new Date(deck.dueAt).toLocaleDateString()
    : 'Not scheduled';
  const intervalLabel = deck?.intervalDays
    ? `${Math.round(deck.intervalDays)}d`
    : '-';

  return (
    <View className="bg-surface border border-border rounded-2xl p-4 mb-4 gap-2">
      <View className="flex-row justify-between">
        <StatItem label="Due" value={dueLabel} />
        <StatItem label="Interval" value={intervalLabel} />
        <StatItem label="Reviews" value={String(totalReviews)} />
        <StatItem label="Avg Stars" value={avgStars} />
      </View>
    </View>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center">
      <Text className="text-foreground text-base font-semibold">{value}</Text>
      <Text className="text-foreground-secondary text-xs">{label}</Text>
    </View>
  );
}
