import { type ReactNode, useMemo, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';
import { formatLocalDateToYmd, formatYmdForDisplay, parseYmd } from './dateUtils';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  popoverPlacement?: 'auto' | 'above' | 'below';
  popoverTitle?: string;
  popoverFooter?: ReactNode;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick date',
  disabled = false,
}: DatePickerProps) {
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
    if (disabled) return;
    Keyboard.dismiss();
    const current = parseYmd(value) ?? new Date();

    if (Platform.OS === 'android' && nativePickerModule?.DateTimePickerAndroid?.open) {
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
      setIosDraftDate(current);
      setShowIosPicker(true);
    }
  }

  function handleConfirmIos() {
    if (iosDraftDate) onChange(formatLocalDateToYmd(iosDraftDate));
    setShowIosPicker(false);
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
                      paddingBottom: 16,
                      minHeight: 460,
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
                      value={iosDraftDate ?? (parseYmd(value) ?? new Date())}
                      mode="date"
                      display="inline"
                      accentColor={colors.primary}
                      onChange={(_event: unknown, selected?: Date) => {
                        if (!selected) return;
                        setIosDraftDate(selected);
                      }}
                    />
                  </View>
                </GlassView>
              </Pressable>
            </Pressable>
          </Modal>
        ) : (
          <DateTimePicker
            value={parseYmd(value) ?? new Date()}
            mode="date"
            display="inline"
            onChange={(_event: unknown, selected?: Date) => {
              if (selected) onChange(formatLocalDateToYmd(selected));
              setShowIosPicker(false);
            }}
          />
        )
      )}
    </View>
  );
}
