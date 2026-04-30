import { View, Text } from 'react-native';
import { useColors } from '@/constants/theme';
import { formatCost } from '@/lib/format';

export function UsageBar({ used, limit }: { used: number; limit: number }) {
  const colors = useColors();
  const pct = limit > 0 ? Math.min(used / limit, 1) : 0;
  const barColor = pct >= 0.9 ? colors.error : colors.primary;

  return (
    <View className="mt-2">
      <View className="flex-row justify-between mb-1">
        <Text className="text-foreground-secondary text-xs">
          {formatCost(used)} / {formatCost(limit)}
        </Text>
        <Text className="text-foreground-secondary text-xs">
          {(pct * 100).toFixed(0)}%
        </Text>
      </View>
      <View className="h-2 rounded-full bg-background-muted overflow-hidden">
        <View
          style={{ width: `${pct * 100}%`, backgroundColor: barColor }}
          className="h-full rounded-full"
        />
      </View>
    </View>
  );
}
