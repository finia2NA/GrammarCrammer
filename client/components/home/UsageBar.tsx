import { View, Text } from 'react-native';
import { useColors } from '@/constants/theme';
import { formatUsagePercent } from '@/lib/format';

export function UsageBar({ used, limit, showLabel = true }: { used: number; limit: number; showLabel?: boolean }) {
  const colors = useColors();
  const pct = limit > 0 ? Math.min(used / limit, 1) : 0;
  const barColor = pct >= 0.9 ? colors.error : colors.primary;

  return (
    <View className="mt-2">
      {showLabel && (
        <View className="flex-row justify-end mb-1">
          <Text className="text-foreground-secondary text-xs">{formatUsagePercent(used, limit)}</Text>
        </View>
      )}
      <View className="h-2 rounded-full bg-background-muted overflow-hidden">
        <View
          style={{ width: `${pct * 100}%`, backgroundColor: barColor }}
          className="h-full rounded-full"
        />
      </View>
    </View>
  );
}
