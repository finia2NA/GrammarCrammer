import { Text, TouchableOpacity } from 'react-native';
import { normalizeTime } from './timeUtils';

interface TimePickerTriggerProps {
  value: string;
  textValue?: string;
  normalizedValue?: string;
  disabled: boolean;
  onTextValueChange?: (value: string) => void;
  onCommitTextValue?: () => void;
  onResetTextValue?: () => void;
  onPress: () => void;
}

export function TimePickerTrigger({
  value,
  disabled,
  onPress,
}: TimePickerTriggerProps) {
  return (
    <TouchableOpacity
      className="px-3 py-2 rounded-lg border border-border bg-background-muted"
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <Text className="text-foreground font-medium">{normalizeTime(value)}</Text>
    </TouchableOpacity>
  );
}
