import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { normalizeTime, splitTime } from './timeUtils';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, disabled = false }: TimePickerProps) {
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
    if (!nativePickerModule || disabled) return;
    const { hour, minute } = splitTime(value);
    const initial = new Date();
    initial.setHours(Number(hour), Number(minute), 0, 0);

    if (nativePickerModule.DateTimePickerAndroid?.open) {
      nativePickerModule.DateTimePickerAndroid.open({
        value: initial,
        mode: 'time',
        is24Hour: true,
        onChange: (_event: unknown, selected?: Date) => {
          if (!selected) return;
          const next = `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`;
          onChange(normalizeTime(next));
        },
      });
      return;
    }

    setShowIosPicker(true);
  }

  if (!nativePickerModule) {
    return (
      <View className="px-3 py-2 rounded-lg border border-border bg-background-muted">
        <Text className="text-foreground font-medium">{normalizeTime(value)}</Text>
      </View>
    );
  }

  const { hour, minute } = splitTime(value);
  const pickerDate = new Date();
  pickerDate.setHours(Number(hour), Number(minute), 0, 0);

  return (
    <View>
      <TouchableOpacity
        className="px-3 py-2 rounded-lg border border-border bg-background-muted"
        onPress={openPicker}
        activeOpacity={0.85}
        disabled={disabled}
      >
        <Text className="text-foreground font-medium">{normalizeTime(value)}</Text>
      </TouchableOpacity>

      {showIosPicker && DateTimePicker && (
        <View className="mb-4">
          <DateTimePicker
            value={pickerDate}
            mode="time"
            display="spinner"
            is24Hour
            onChange={(_event: unknown, selected?: Date) => {
              if (selected) {
                const next = `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`;
                onChange(normalizeTime(next));
              }
              setShowIosPicker(false);
            }}
          />
        </View>
      )}
    </View>
  );
}
