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

interface PageSheetModalProps {
  visible: boolean;
  title: string;
  cancelText: string;
  onCancel: () => void;
  confirmText?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  children: ReactNode;
}

export function PageSheetModal({
  visible,
  title,
  cancelText,
  onCancel,
  confirmText,
  onConfirm,
  confirmDisabled = false,
  children,
}: PageSheetModalProps) {
  const insets = useSafeAreaInsets();
  const { height, isSmallScreen } = useScreenSize();
  const scheme = useColorScheme();
  const themeVars = scheme === 'dark' ? darkThemeVars : lightThemeVars;

  // Internal state keeps Modal mounted while the exit animation plays on large screens.
  const [shown, setShown] = useState(false);
  const slideY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

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
    if (!visible) setShown(false);
  }, [visible, isSmallScreen, height, slideY, backdropOpacity]);

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
  }, [height, slideY, backdropOpacity]);

  const handleCancel = useCallback(() => {
    if (isSmallScreen) {
      onCancel();
      return;
    }
    animateOut(onCancel);
  }, [isSmallScreen, onCancel, animateOut]);

  const handleConfirm = useCallback(() => {
    if (!onConfirm || confirmDisabled) return;
    if (isSmallScreen) {
      onConfirm();
      return;
    }
    animateOut(onConfirm);
  }, [onConfirm, confirmDisabled, isSmallScreen, animateOut]);

  const header = (
    <View
      className="flex-row items-center border-b border-border"
      style={{
        paddingHorizontal: 24,
        paddingTop: isSmallScreen ? insets.top + 16 : 20,
        paddingBottom: 16,
      }}
    >
      <TouchableOpacity onPress={handleCancel} style={styles.headerSide}>
        <Text className="text-primary text-base">{cancelText}</Text>
      </TouchableOpacity>

      <Text className="flex-1 text-center text-foreground text-lg font-bold" numberOfLines={1}>
        {title}
      </Text>

      {confirmText ? (
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={confirmDisabled}
          style={[styles.headerSide, styles.headerSideRight]}
        >
          <Text className={`text-base font-semibold ${confirmDisabled ? 'text-foreground-secondary' : 'text-primary'}`}>
            {confirmText}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.headerSide} />
      )}
    </View>
  );

  const modalVisible = isSmallScreen ? visible : shown;
  const bodyPaddingBottom = isSmallScreen ? insets.bottom + 24 : 24;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleCancel}
    >
      <View style={[styles.overlay, isSmallScreen ? styles.overlaySmall : styles.overlayLarge, themeVars]}>
        {!isSmallScreen && (
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancel}>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
          </Pressable>
        )}

        <Animated.View
          style={[
            isSmallScreen
              ? styles.sheet
              : styles.card,
            isSmallScreen
              ? undefined
              : { maxHeight: height * 0.9, transform: [{ translateY: slideY }] },
          ]}
        >
          <KeyboardAvoidingView
            className={isSmallScreen ? 'flex-1 bg-background' : 'bg-background rounded-2xl overflow-hidden'}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={isSmallScreen ? styles.sheetContainer : { maxHeight: height * 0.9 }}
          >
            {header}
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: bodyPaddingBottom,
              }}
              keyboardShouldPersistTaps="handled"
            >
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
  },
  overlayLarge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlaySmall: {
    justifyContent: 'flex-start',
    alignItems: 'stretch',
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
  sheetContainer: {
    flex: 1,
    maxHeight: '100%',
  },
  sheet: {
    flex: 1,
    width: '100%',
  },
  bodyScroll: {
    flex: 1,
  },
  headerSide: {
    width: 92,
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
});
