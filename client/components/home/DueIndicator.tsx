import { View, Text } from 'react-native';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';

export function DueIndicator({ dueAt, isDue }: { dueAt: number | null; isDue: boolean }) {
  const colors = useColors();

  if (dueAt == null) {
    return (
      // @ts-ignore — title is valid on web View for hover tooltip
      <View style={{ width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }} title="Not yet studied">
        <Icon name="not-started" size={12} color={colors.warning} />
        <Text style={{ color: colors.warning, fontSize: 10 }}>new</Text>
      </View>
    );
  }

  const diffDays = Math.round((dueAt - Date.now()) / 86400000);

  const color = isDue ? colors.error : colors.success;
  const icon = isDue ? 'clock' : 'check';
  const label = diffDays === 0 ? 'today' : `${Math.abs(diffDays)}d`;
  const tooltip = isDue
    ? diffDays === 0 ? 'Due today' : `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`
    : diffDays === 0 ? 'Due today' : `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;

  return (
    // @ts-ignore — title is valid on web View for hover tooltip
    <View style={{ width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }} title={tooltip}>
      <Icon name={icon} size={12} color={color} />
      <Text style={{ color, fontSize: 10, fontVariant: ['tabular-nums'] }}>{label}</Text>
    </View>
  );
}
