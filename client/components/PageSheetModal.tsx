import { type ReactNode, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  StyleSheet,
  Appearance,
  type ColorSchemeName,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScreenSize } from '@/hooks/useScreenSize';
import { darkThemeVars, lightThemeVars } from '@/constants/theme';
import { TouchTarget } from '@/components/TouchTarget';
import { PageSheetScrollContext } from '@/components/PageSheetScrollContext';

interface PageSheetModalProps {
  visible: boolean;
  title: string;
  cancelText: string;
  onCancel: () => void;
  confirmText?: string;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  confirmCloses?: boolean;
  children: ReactNode;
}

function resolveColorScheme(scheme: ColorSchemeName | null | undefined): 'light' | 'dark' {
  return scheme === 'light' ? 'light' : 'dark';
}

export function PageSheetModal({
  visible,
  title,
  cancelText,
  onCancel,
  confirmText,
  onConfirm,
  confirmDisabled = false,
  confirmCloses = true,
  children,
}: PageSheetModalProps) {
  const insets = useSafeAreaInsets();
  const { height, isSmallScreen } = useScreenSize();
  const [scheme, setScheme] = useState<'light' | 'dark'>(resolveColorScheme(Appearance.getColorScheme()));
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(resolveColorScheme(colorScheme));
    });
    return () => sub.remove();
  }, []);

  const themeVars = scheme === 'dark' ? darkThemeVars : lightThemeVars;

  // Internal state keeps Modal mounted while the exit animation plays on large screens.
  const [shown, setShown] = useState(false);
  const slideY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShown(true);
      slideY.setValue(height);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 30,
          stiffness: 300,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
    if (!visible) setShown(false);
  }, [visible, height, slideY, backdropOpacity]);

  const animateOut = useCallback((then: () => void) => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: height,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShown(false);
      then();
    });
  }, [height, slideY, backdropOpacity]);

  const handleCancel = useCallback(() => {
    animateOut(onCancel);
  }, [onCancel, animateOut]);

  const handleConfirm = useCallback(() => {
    if (!onConfirm || confirmDisabled) return;
    if (confirmCloses) animateOut(onConfirm);
    else onConfirm();
  }, [onConfirm, confirmDisabled, confirmCloses, animateOut]);

  const header = (
    <View
      className="flex-row items-center border-b border-border"
      style={{
        paddingHorizontal: 24,
        paddingTop: isSmallScreen ? insets.top + 8 : 12,
        paddingBottom: 8,
      }}
    >
      <TouchTarget onPress={handleCancel} style={[styles.headerSide, styles.headerTargetLeft]}>
        <Text className="text-primary text-base">{cancelText}</Text>
      </TouchTarget>

      <Text className="flex-1 text-center text-foreground text-lg font-bold" numberOfLines={1}>
        {title}
      </Text>

      {confirmText ? (
        <TouchTarget
          onPress={handleConfirm}
          disabled={confirmDisabled}
          style={[styles.headerSide, styles.headerSideRight, styles.headerTargetRight]}
        >
          <Text className={`text-base font-semibold ${confirmDisabled ? 'text-foreground-secondary' : 'text-primary'}`}>
            {confirmText}
          </Text>
        </TouchTarget>
      ) : (
        <View style={styles.headerSide} />
      )}
    </View>
  );

  const modalVisible = shown;
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
            isSmallScreen ? styles.sheet : styles.card,
            { transform: [{ translateY: slideY }] },
            isSmallScreen ? undefined : { height: Math.min(height * 0.88, 680) },
          ]}
        >
          <KeyboardAvoidingView
            className={isSmallScreen ? 'flex-1 bg-background' : 'bg-background rounded-2xl overflow-hidden'}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={isSmallScreen ? styles.sheetContainer : styles.cardContainer}
          >
            {header}
            <PageSheetScrollContext.Provider value={isScrollingRef}>
              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={{
                  paddingHorizontal: 24,
                  paddingTop: 16,
                  paddingBottom: bodyPaddingBottom,
                }}
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={() => { isScrollingRef.current = true; }}
                onScrollEndDrag={() => { setTimeout(() => { isScrollingRef.current = false; }, 80); }}
                onMomentumScrollEnd={() => { isScrollingRef.current = false; }}
              >
                {children}
              </ScrollView>
            </PageSheetScrollContext.Provider>
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
  cardContainer: {
    flex: 1,
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
  headerTargetLeft: {
    paddingVertical: 8,
    paddingRight: 16,
    paddingLeft: 0,
  },
  headerTargetRight: {
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 0,
  },
});
