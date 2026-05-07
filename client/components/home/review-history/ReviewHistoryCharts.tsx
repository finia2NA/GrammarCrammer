import { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';

import { useColors } from '@/constants/theme';
import type { CollectionReviewRecord, DeckReviewRecord, GrammarCaseSummary } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { formatShortDate } from './utils';

export function IntervalChart({
  reviews,
  isCollection,
  colors,
}: {
  reviews: (DeckReviewRecord | CollectionReviewRecord)[];
  isCollection: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const chartWidth = 320;
  const chartHeight = 140;
  const padLeft = 40;
  const padRight = 16;
  const padTop = 12;
  const padBottom = 28;
  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const { lines, maxInterval, dateLabels } = useMemo(() => {
    if (isCollection) {
      const byDeck = new Map<string, typeof reviews>();
      for (const r of reviews) {
        const key = (r as CollectionReviewRecord).deckName ?? r.deckId;
        if (!byDeck.has(key)) byDeck.set(key, []);
        byDeck.get(key)!.push(r);
      }
      let max = 1;
      type ChartPoint = { x: number; y: number; interval: number };
      const ls: { points: ChartPoint[]; label: string }[] = [];
      const allDates = reviews.map(r => new Date(r.studiedAt).getTime());
      const minDate = Math.min(...allDates);
      const maxDate = Math.max(...allDates);
      const dateRange = maxDate - minDate || 1;

      for (const [name, deckReviews] of byDeck) {
        const sorted = [...deckReviews].sort((a, b) => new Date(a.studiedAt).getTime() - new Date(b.studiedAt).getTime());
        const pts: ChartPoint[] = sorted.map(r => {
          const t = new Date(r.studiedAt).getTime();
          return {
            x: padLeft + ((t - minDate) / dateRange) * plotW,
            y: 0,
            interval: r.intervalApplied,
          };
        });
        for (const p of pts) max = Math.max(max, p.interval);
        ls.push({ points: pts, label: name });
      }
      for (const line of ls) {
        for (const p of line.points) {
          p.y = padTop + plotH - (p.interval / max) * plotH;
        }
      }

      const labels: string[] = [];
      if (reviews.length > 0) {
        labels.push(formatShortDate(new Date(minDate)));
        if (minDate !== maxDate) labels.push(formatShortDate(new Date(maxDate)));
      }

      return { lines: ls, maxInterval: max, dateLabels: labels };
    }

    let max = 1;
    const points = reviews.map((r, i) => {
      max = Math.max(max, r.intervalApplied);
      return { x: padLeft + (i / Math.max(1, reviews.length - 1)) * plotW, y: 0, interval: r.intervalApplied };
    });
    for (const p of points) {
      p.y = padTop + plotH - (p.interval / max) * plotH;
    }

    const labels: string[] = [];
    if (reviews.length > 0) {
      labels.push(formatShortDate(new Date(reviews[0].studiedAt)));
      if (reviews.length > 1) labels.push(formatShortDate(new Date(reviews[reviews.length - 1].studiedAt)));
    }

    return { lines: [{ points, label: '' }], maxInterval: max, dateLabels: labels };
  }, [reviews, isCollection, plotW, plotH]);

  const lineColors = [colors.primary, colors.success, colors.error, '#f59e0b', '#8b5cf6', '#06b6d4'];

  return (
    <View className="bg-surface border border-border rounded-2xl p-4 mb-4">
      <Text className="text-foreground-secondary text-xs font-medium mb-2">Interval Over Time</Text>
      <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <SvgText x={padLeft - 6} y={padTop + 4} textAnchor="end" fontSize={10} fill={colors.foreground_secondary}>
          {Math.round(maxInterval)}d
        </SvgText>
        <SvgText x={padLeft - 6} y={padTop + plotH + 4} textAnchor="end" fontSize={10} fill={colors.foreground_secondary}>
          0
        </SvgText>
        <Line x1={padLeft} y1={padTop + plotH} x2={padLeft + plotW} y2={padTop + plotH} stroke={colors.border} strokeWidth={1} />

        {lines.map((line, li) => {
          if (line.points.length < 2) return null;
          const pointStr = line.points.map(p => `${p.x},${p.y}`).join(' ');
          return (
            <Polyline
              key={li}
              points={pointStr}
              fill="none"
              stroke={lineColors[li % lineColors.length]}
              strokeWidth={2}
            />
          );
        })}

        {lines.map((line, li) =>
          line.points.map((p, pi) => (
            <Circle
              key={`${li}-${pi}`}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={lineColors[li % lineColors.length]}
            />
          ))
        )}

        {dateLabels[0] && (
          <SvgText x={padLeft} y={chartHeight - 4} fontSize={10} fill={colors.foreground_secondary}>
            {dateLabels[0]}
          </SvgText>
        )}
        {dateLabels[1] && (
          <SvgText x={padLeft + plotW} y={chartHeight - 4} textAnchor="end" fontSize={10} fill={colors.foreground_secondary}>
            {dateLabels[1]}
          </SvgText>
        )}
      </Svg>

      {isCollection && lines.length > 1 && (
        <View className="flex-row flex-wrap gap-3 mt-2">
          {lines.map((line, i) => (
            <View key={i} className="flex-row items-center gap-1">
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: lineColors[i % lineColors.length] }} />
              <Text className="text-foreground-secondary text-xs" numberOfLines={1}>{line.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function GrammarCaseDifficultyChart({
  cases,
  colors,
}: {
  cases: GrammarCaseSummary[];
  colors: ReturnType<typeof useColors>;
}) {
  const { t } = useI18n();
  const visible = cases.slice(0, 12);
  const maxDifficulty = Math.max(0.4, ...visible.map(item => item.difficulty));

  return (
    <View className="bg-surface border border-border rounded-2xl p-4 mb-4">
      <Text className="text-foreground-secondary text-xs font-medium mb-3">{t('history.grammarCaseDifficulty')}</Text>
      <View className="gap-2">
        {visible.map((item) => {
          const width = `${Math.max(10, (item.difficulty / maxDifficulty) * 100)}%` as const;
          const accuracy = item.seenCount > 0
            ? Math.round((item.correctFirstTryCount / item.seenCount) * 100)
            : null;
          return (
            <View key={item.id}>
              <View className="h-9 rounded-lg overflow-hidden justify-center" style={{ backgroundColor: colors.background_muted }}>
                <View
                  className="absolute left-0 top-0 bottom-0 rounded-lg"
                  style={{
                    width,
                    backgroundColor: item.difficulty >= 0.55 ? colors.error : item.difficulty >= 0.4 ? '#f59e0b' : colors.success,
                    opacity: 0.82,
                  }}
                />
                <View className="relative px-3 flex-row items-center justify-between gap-2">
                  <Text className="text-white text-xs font-semibold flex-1" numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text className="text-white text-[11px] font-medium">
                    {item.seenCount === 0 ? 'new' : `${Math.round(item.difficulty * 100)}${accuracy !== null ? ` / ${accuracy}%` : ''}`}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
