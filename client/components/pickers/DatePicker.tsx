import { useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/constants/theme';
import { formatLocalDateToYmd, formatYmdForDisplay, parseYmd } from './dateUtils';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick date',
  disabled = false,
}: DatePickerProps) {
  const colors = useColors();
  const [showIosPicker, setShowIosPicker] = useState(false);

  const nativePickerModule = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@react-native-community/datetimepicker');
    } catch {
      return null;
    }
  }, []);
  const DateTimePicker = nativePickerModule?.default;

  function openPicker() {
    if (disabled) return;
    const current = parseYmd(value) ?? new Date();

    if (nativePickerModule?.DateTimePickerAndroid?.open) {
      nativePickerModule.DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        is24Hour: true,
        onChange: (_event: unknown, selected?: Date) => {
          if (!selected) return;
          onChange(formatLocalDateToYmd(selected));
        },
      });
      return;
    }

    if (DateTimePicker) {
      setShowIosPicker(true);
    }
  }

  if (!nativePickerModule) {
    return (
      <TextInput
        className="bg-background-muted border border-border rounded-xl px-4 py-3 text-foreground"
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.foreground_muted}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
      />
    );
  }

  return (
    <View className="gap-2">
      <TouchableOpacity
        className="bg-background-muted border border-border rounded-xl px-4 py-3"
        onPress={openPicker}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Text className="text-foreground">{formatYmdForDisplay(value, placeholder)}</Text>
      </TouchableOpacity>

      {showIosPicker && DateTimePicker && (
        <DateTimePicker
          value={parseYmd(value) ?? new Date()}
          mode="date"
          display="inline"
          onChange={(_event: unknown, selected?: Date) => {
            if (selected) onChange(formatLocalDateToYmd(selected));
            setShowIosPicker(false);
          }}
        />
      )}
    </View>
  );
}
