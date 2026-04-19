import { type ReactNode, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenSize } from '@/hooks/useScreenSize';
import { darkThemeVars, lightThemeVars } from '@/constants/theme';

interface HeaderAction {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

interface PageSheetModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  leftAction?: HeaderAction;
  rightAction?: HeaderAction;
  children: ReactNode;
}

export function PageSheetModal({
  visible,
  onClose,
  title,
  leftAction,
  rightAction,
  children,
}: PageSheetModalProps) {
  const insets = useSafeAreaInsets();
  const { height, isSmallScreen } = useScreenSize();
  const scheme = useColorScheme();
  const themeVars = scheme === 'dark' ? darkThemeVars : lightThemeVars;

  // Internal state keeps Modal mounted while the exit animation plays.
  const [shown, setShown] = useState(false);
  const slideY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Open: mount modal, then animate in
  useEffect(() => {
    if (visible && !isSmallScreen) {
      setShown(true);
      slideY.setValue(height);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 200,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
    // External close (e.g. programmatic) — just sync internal state
    if (!visible) setShown(false);
  }, [visible, isSmallScreen]);

  // Animate out, then call a callback
  const animateOut = useCallback((then: () => void) => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShown(false);
      then();
    });
  }, [height]);

  const handleDismiss = useCallback(() => animateOut(onClose), [animateOut, onClose]);

  // On large screens, wrap header action presses to animate out first
  function wrapAction(action: HeaderAction): HeaderAction {
    if (isSmallScreen) return action;
    return { ...action, onPress: () => animateOut(action.onPress) };
  }

  const resolvedLeft = leftAction ? wrapAction(leftAction) : undefined;
  const resolvedRight = rightAction ? wrapAction(rightAction) : undefined;

  const header = (
    <View className="flex-row items-center justify-between mb-8">
      {resolvedLeft ? (
        <TouchableOpacity onPress={resolvedLeft.onPress} className="w-16">
          <Text className="text-primary text-base">{resolvedLeft.label}</Text>
        </TouchableOpacity>
      ) : (
        <View className="w-16" />
      )}
      <Text className="text-foreground text-lg font-bold">{title}</Text>
      {resolvedRight ? (
        <TouchableOpacity
          onPress={resolvedRight.onPress}
          disabled={resolvedRight.disabled}
          className="w-16 items-end"
        >
          <Text className={`text-base font-semibold ${resolvedRight.disabled ? 'text-muted-foreground' : 'text-primary'}`}>
            {resolvedRight.label}
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="w-16" />
      )}
    </View>
  );

  // ── Small screen: native page sheet ──────────────────────────────────────────
  if (isSmallScreen) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          className="flex-1 bg-background"
          style={themeVars}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              paddingHorizontal: 24,
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 24,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {header}
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // ── Large screen: floating card with backdrop ────────────────────────────────
  return (
    <Modal
      visible={shown}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={[styles.overlay, themeVars]}>
        {/* Backdrop — tap to dismiss */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            { maxHeight: height * 0.85, transform: [{ translateY: slideY }] },
          ]}
        >
          <KeyboardAvoidingView
            className="bg-background rounded-2xl overflow-hidden"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: 24,
                paddingTop: 24,
                paddingBottom: 24,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {header}
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
});
