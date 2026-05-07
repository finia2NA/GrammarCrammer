import { Switch } from 'react-native';
import { useColors } from '@/constants/theme';

interface ThemedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ThemedSwitch({ value, onValueChange, disabled }: ThemedSwitchProps) {
  const colors = useColors();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor={value ? colors.surface : colors.primary}
    />
  );
}
