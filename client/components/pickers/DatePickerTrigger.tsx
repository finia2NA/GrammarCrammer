import { Text, TouchableOpacity } from 'react-native';
import { formatYmdForDisplay } from './dateUtils';

interface DatePickerTriggerProps {
  value: string;
  placeholder: string;
  disabled: boolean;
  onPress: () => void;
}

export function DatePickerTrigger({
  value,
  placeholder,
  disabled,
  onPress,
}: DatePickerTriggerProps) {
  return (
    <TouchableOpacity
      className="bg-background-muted border border-border rounded-xl px-4 py-3"
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <Text className="text-foreground">{formatYmdForDisplay(value, placeholder)}</Text>
    </TouchableOpacity>
  );
}
