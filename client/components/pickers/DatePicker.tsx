import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Modal, PanResponder, Platform, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  popoverFooter,
}: DatePickerProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [iosDraftDate, setIosDraftDate] = useState<Date | null>(null);
  const sheetY = useRef(new Animated.Value(520)).current;
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
      sheetY.setValue(520);
      backdropOpacity.setValue(0);
      setShowIosPicker(true);
    }
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
        toValue: 520,
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
    if (iosDraftDate) onChange(formatLocalDateToYmd(iosDraftDate));
    closeIosPicker();
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
                        minHeight: 500,
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
                        value={iosDraftDate ?? (parseYmd(value) ?? new Date())}
                        mode="date"
                        display="inline"
                        accentColor={colors.primary}
                        onChange={(_event: unknown, selected?: Date) => {
                          if (!selected) return;
                          setIosDraftDate(selected);
                        }}
                      />
                      {popoverFooter ? (
                        <View className="mt-4 mb-5">
                          {popoverFooter}
                        </View>
                      ) : null}
                    </View>
                  </GlassView>
                </Pressable>
              </Animated.View>
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
