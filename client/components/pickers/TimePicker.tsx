import { useMemo, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { useColors } from '@/constants/theme';
import { Icon } from '@/components/Icon';
import { normalizeTime, splitTime } from './timeUtils';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, disabled = false }: TimePickerProps) {
  const colors = useColors();
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [iosDraftDate, setIosDraftDate] = useState<Date | null>(null);

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
    Keyboard.dismiss();
    const { hour, minute } = splitTime(value);
    const initial = new Date();
    initial.setHours(Number(hour), Number(minute), 0, 0);

    if (Platform.OS === 'android' && nativePickerModule.DateTimePickerAndroid?.open) {
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

    setIosDraftDate(initial);
    setShowIosPicker(true);
  }

  function handleConfirmIos() {
    if (iosDraftDate) {
      const next = `${String(iosDraftDate.getHours()).padStart(2, '0')}:${String(iosDraftDate.getMinutes()).padStart(2, '0')}`;
      onChange(normalizeTime(next));
    }
    setShowIosPicker(false);
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
        Platform.OS === 'ios' ? (
          <Modal
            transparent
            visible={showIosPicker}
            animationType="fade"
            onRequestClose={() => setShowIosPicker(false)}
          >
            <Pressable
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}
              onPress={() => setShowIosPicker(false)}
            >
              <Pressable
                style={{
                  borderRadius: 28,
                  overflow: 'hidden',
                  marginHorizontal: 12,
                  marginBottom: 12,
                }}
                onPress={() => {}}
              >
                <GlassView
                  glassEffectStyle="regular"
                  colorScheme="auto"
                >
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 28,
                      paddingHorizontal: 14,
                      paddingTop: 10,
                      paddingBottom: 20,
                      minHeight: 330,
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-4">
                      <TouchableOpacity
                        onPress={() => setShowIosPicker(false)}
                        activeOpacity={0.85}
                        className="w-14 h-14 rounded-full items-center justify-center"
                        style={{ backgroundColor: 'rgba(20, 22, 26, 0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
                      >
                        <Icon name="close" size={30} color={colors.foreground} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleConfirmIos}
                        activeOpacity={0.9}
                        className="w-14 h-14 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.secondary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' }}
                      >
                        <Icon name="check" size={30} color={colors.primary_foreground} />
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={iosDraftDate ?? pickerDate}
                      mode="time"
                      display="spinner"
                      is24Hour
                      onChange={(_event: unknown, selected?: Date) => {
                        if (!selected) return;
                        setIosDraftDate(selected);
                      }}
                      style={{ height: 240 }}
                    />
                  </View>
                </GlassView>
              </Pressable>
            </Pressable>
          </Modal>
        ) : (
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
        )
      )}
    </View>
  );
}
