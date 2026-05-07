import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

import { useColors } from '@/constants/theme';
import type { CollectionReviewRecord, DeckReviewRecord } from '@/lib/api';
import { formatShortDate, renderStars } from './utils';

const PAGE_SIZE = 10;

function pageItems(current: number, total: number): (number | '...')[] {
  const pages = new Set([1, Math.max(1, current - 1), current, Math.min(total, current + 1), total]);
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | '...')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
    result.push(sorted[i]);
  }
  return result;
}

export function ReviewHistoryTable({
  reviews,
  isCollection,
  refreshing = false,
}: {
  reviews: (DeckReviewRecord | CollectionReviewRecord)[];
  isCollection: boolean;
  refreshing?: boolean;
}) {
  const colors = useColors();
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(reviews.length / PAGE_SIZE);
  const visible = reviews.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <View className="gap-2">
      <View className="bg-surface border border-border rounded-2xl overflow-hidden">
        <View className="flex-row px-4 py-2 border-b border-border bg-background-muted">
          <Text className="text-foreground-secondary text-xs font-medium" style={{ width: 70 }}>Date</Text>
          {isCollection && <Text className="text-foreground-secondary text-xs font-medium flex-1" numberOfLines={1}>Deck</Text>}
          <Text className="text-foreground-secondary text-xs font-medium text-center" style={{ width: 40 }}>Stars</Text>
          <Text className="text-foreground-secondary text-xs font-medium text-center" style={{ width: 55 }}>Score</Text>
          <Text className="text-foreground-secondary text-xs font-medium text-right" style={{ width: 55 }}>Interval</Text>
        </View>

        {refreshing && page === 0 && (
          <View className="flex-row items-center px-4 py-2.5 border-b border-foreground/5 gap-2">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-foreground-secondary text-xs italic">Updating…</Text>
          </View>
        )}
        {visible.map((review, i) => {
          const isScheduleChange = review.eventType === 'schedule_change';
          return (
            <View
              key={review.id}
              className={`flex-row items-center px-4 py-2.5 ${i < visible.length - 1 ? 'border-b border-foreground/5' : ''}`}
            >
              <Text className="text-foreground text-xs" style={{ width: 70 }}>
                {formatShortDate(new Date(review.studiedAt))}
              </Text>
              {isCollection && (
                <Text className="text-foreground text-xs flex-1" numberOfLines={1}>
                  {(review as CollectionReviewRecord).deckName}
                </Text>
              )}
              {isScheduleChange ? (
                <Text className="text-foreground-secondary text-xs flex-1 italic" numberOfLines={1}>
                  rescheduled → {review.aiRecap}
                </Text>
              ) : review.eventType === 'reset' ? (
                <Text className="text-foreground-secondary text-xs flex-1 italic" numberOfLines={1}>
                  reset to never studied
                </Text>
              ) : (
                <>
                  <Text className="text-foreground text-xs text-center" style={{ width: 40 }}>
                    {renderStars(review.userStars)}
                  </Text>
                  <Text className="text-foreground text-xs text-center" style={{ width: 55 }}>
                    {review.correctCount != null && review.totalCount != null
                      ? `${review.correctCount}/${review.totalCount}`
                      : '-'}
                  </Text>
                  <Text className="text-foreground-secondary text-xs text-right" style={{ width: 55 }}>
                    {Math.round(review.intervalApplied * 10) / 10}d
                  </Text>
                </>
              )}
            </View>
          );
        })}
      </View>

      {totalPages > 1 && (
        <View className="flex-row items-center justify-center gap-1.5 flex-wrap">
          <PagePill label="first" selected={page === 0} onPress={() => setPage(0)} colors={colors} />
          {pageItems(page + 1, totalPages).map((item, i) =>
            item === '...'
              ? <Text key={`ellipsis-${i}`} className="text-foreground-secondary text-xs px-0.5">…</Text>
              : <PageNumber key={item} n={item} selected={item === page + 1} onPress={() => setPage(item - 1)} colors={colors} />
          )}
          <PagePill label="last" selected={page === totalPages - 1} onPress={() => setPage(totalPages - 1)} colors={colors} />
        </View>
      )}
    </View>
  );
}

function PageNumber({ n, selected, onPress, colors }: { n: number; selected: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: selected ? colors.primary : colors.surface, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: 11, fontWeight: '500', color: selected ? '#fff' : colors.foreground_secondary }}>{n}</Text>
    </TouchableOpacity>
  );
}

function PagePill({ label, selected, onPress, colors }: { label: string; selected: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: selected ? colors.primary : colors.surface, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: 11, fontWeight: '500', color: selected ? '#fff' : colors.foreground_secondary }}>{label}</Text>
    </TouchableOpacity>
  );
}
