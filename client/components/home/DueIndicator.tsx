import { View, Text } from 'react-native';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';

export function DueIndicator({ dueAt, isDue }: { dueAt: number | null; isDue: boolean }) {
  const colors = useColors();

  if (dueAt == null) {
    return (
      <View style={{ width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
        <Icon name="not-started" size={12} color={colors.foreground_secondary} />
        <Text style={{ color: colors.foreground_secondary, fontSize: 10 }}>new</Text>
      </View>
    );
  }

  const diffDays = Math.round((dueAt - Date.now()) / 86400000);

  const color = isDue ? (diffDays < 0 ? colors.error : colors.warning) : colors.success;
  const label = diffDays === 0 ? '' : `${diffDays}d`;

  return (
    <View style={{ width: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
      <Icon name="clock" size={12} color={color} />
      {label !== '' && (
        <Text style={{ color, fontSize: 10, fontVariant: ['tabular-nums'] }}>{label}</Text>
      )}
    </View>
  );
}
