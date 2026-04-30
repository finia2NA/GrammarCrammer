import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { useColors } from '@/constants/theme';

export type PlatformPopoverPlacement = 'auto' | 'above' | 'below';

export interface PlatformPopoverTriggerActions {
  open: boolean;
  openPopover: () => void;
  closePopover: () => void;
  togglePopover: () => void;
}

interface PlatformPopoverProps {
  title: string;
  disabled?: boolean;
  placement?: PlatformPopoverPlacement;
  fallbackHeight: number;
  maxWidth: number;
  closeDelay?: number;
  footer?: ReactNode;
  onDone: () => void;
  onCancel?: () => void;
  repositionDeps?: unknown[];
  anchorDisplay?: string;
  sheetHeight?: number;
  minHeight?: number;
  children: ReactNode;
  trigger: (actions: PlatformPopoverTriggerActions) => ReactNode;
}

export function PlatformPopover({
  title,
  disabled = false,
  footer,
  onDone,
  onCancel,
  sheetHeight = 420,
  minHeight = 360,
  children,
  trigger,
}: PlatformPopoverProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const sheetY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openPopover = useCallback(() => {
    if (disabled) return;
    sheetY.setValue(sheetHeight);
    backdropOpacity.setValue(0);
    setOpen(true);
  }, [backdropOpacity, disabled, sheetHeight, sheetY]);

  useEffect(() => {
    if (!open || Platform.OS !== 'ios') return;
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
  }, [backdropOpacity, open, sheetY]);

  const closePopover = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetY, {
        toValue: sheetHeight,
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
    ]).start(() => setOpen(false));
  }, [backdropOpacity, sheetHeight, sheetY]);

  const sheetPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, { dx, dy }) => (
      Platform.OS === 'ios' && open && dy > 8 && Math.abs(dy) > Math.abs(dx)
    ),
    onPanResponderGrant: () => {
      sheetY.stopAnimation();
    },
    onPanResponderMove: (_, { dy }) => {
      sheetY.setValue(Math.max(0, dy));
    },
    onPanResponderRelease: (_, { dy, vy }) => {
      if (dy > 90 || vy > 0.8) {
        closePopover();
        return;
      }

      Animated.spring(sheetY, {
        toValue: 0,
        damping: 24,
        stiffness: 260,
        useNativeDriver: true,
      }).start();
    },
  }), [closePopover, open, sheetY]);

  function handleCancel() {
    onCancel?.();
    closePopover();
  }

  function handleDone() {
    onDone();
    closePopover();
  }

  const actions: PlatformPopoverTriggerActions = {
    open,
    openPopover,
    closePopover,
    togglePopover: open ? closePopover : openPopover,
  };

  return (
    <View>
      {trigger(actions)}

      {open && Platform.OS === 'ios' ? (
        <Modal
          transparent
          visible={open}
          animationType="none"
          onRequestClose={closePopover}
        >
          <Pressable
            style={{ flex: 1, justifyContent: 'flex-end' }}
            onPress={closePopover}
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
                      minHeight,
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-4">
                      <TouchableOpacity
                        onPress={handleCancel}
                        activeOpacity={0.85}
                        className="w-14 h-14 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
                      >
                        <Icon name="close" size={26} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text
                        className="text-foreground font-bold"
                        style={{ fontSize: 16 }}
                      >
                        {title}
                      </Text>
                      <TouchableOpacity
                        onPress={handleDone}
                        activeOpacity={0.9}
                        className="w-14 h-14 rounded-full items-center justify-center"
                        style={{ backgroundColor: colors.primary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' }}
                      >
                        <Icon name="check" size={30} color={colors.primary_foreground} />
                      </TouchableOpacity>
                    </View>

                    {children}

                    {footer ? (
                      <View className="mt-4 mb-5">
                        {footer}
                      </View>
                    ) : null}
                  </View>
                </GlassView>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
