import { View, Text } from 'react-native';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';

export function DueIndicator({ dueAt }: { dueAt: number }) {
  const colors = useColors();
  const diffDays = Math.round((dueAt - Date.now()) / 86400000);

  const color = diffDays > 0 ? colors.success : diffDays === 0 ? colors.warning : colors.error;
  const label = diffDays === 0 ? '' : `${diffDays}d`;

  return (
    <View style={{ width: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
      <Icon name="clock" size={12} color={color} />
      {label !== '' && (
        <Text style={{ color, fontSize: 10, fontVariant: ['tabular-nums'] }}>{label}</Text>
      )}
    </View>
  );
}
