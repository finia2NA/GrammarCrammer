import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Modal, PanResponder, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [iosDraftDate, setIosDraftDate] = useState<Date | null>(null);
  const sheetY = useRef(new Animated.Value(420)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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
    sheetY.setValue(420);
    backdropOpacity.setValue(0);
    setShowIosPicker(true);
  }

  useEffect(() => {
    if (!showIosPicker || Platform.OS !== 'ios') return;
    Animated.parallel([
      Animated.spring(sheetY, {
        toValue: 0,
        damping: 26,
        stiffness: 260,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [showIosPicker, sheetY, backdropOpacity]);

  const closeIosPicker = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: 420,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setShowIosPicker(false));
  }, [sheetY, backdropOpacity]);

  const sheetPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) => (
      Platform.OS === 'ios' && showIosPicker && dy > 8 && Math.abs(dy) > Math.abs(dx)
    ),
    onPanResponderGrant: () => {
      sheetY.stopAnimation();
    },
    onPanResponderMove: (_, { dy }) => {
      sheetY.setValue(Math.max(0, dy));
    },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 90 || vy > 0.8) {
        closeIosPicker();
        return;
      }

      Animated.spring(sheetY, {
        toValue: 0,
        damping: 24,
        stiffness: 260,
        useNativeDriver: true,
      }).start();
    },
  }), [closeIosPicker, showIosPicker, sheetY]);

  function handleConfirmIos() {
    if (iosDraftDate) {
      const next = `${String(iosDraftDate.getHours()).padStart(2, '0')}:${String(iosDraftDate.getMinutes()).padStart(2, '0')}`;
      onChange(normalizeTime(next));
    }
    closeIosPicker();
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
            animationType="none"
            onRequestClose={closeIosPicker}
          >
            <Pressable
              style={{ flex: 1, justifyContent: 'flex-end' }}
              onPress={closeIosPicker}
            >
              <Animated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  opacity: backdropOpacity,
                }}
              />
              <Animated.View
                {...sheetPanResponder.panHandlers}
                style={{
                  marginHorizontal: 12,
                  marginBottom: -Math.max(insets.bottom, 18),
                  transform: [{ translateY: sheetY }],
                }}
              >
                <Pressable
                  style={{
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    overflow: 'hidden',
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
                        borderTopLeftRadius: 28,
                        borderTopRightRadius: 28,
                        paddingHorizontal: 14,
                        paddingTop: 10,
                        paddingBottom: Math.max(insets.bottom, 18) + 22,
                        minHeight: 360,
                      }}
                    >
                      <View className="flex-row items-center justify-between mb-4">
                        <TouchableOpacity
                          onPress={closeIosPicker}
                          activeOpacity={0.85}
                          className="w-14 h-14 rounded-full items-center justify-center"
                          style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
                        >
                          <Icon name="close" size={26} color={colors.foreground} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleConfirmIos}
                          activeOpacity={0.9}
                          className="w-14 h-14 rounded-full items-center justify-center"
                          style={{ backgroundColor: colors.primary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' }}
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
              </Animated.View>
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
