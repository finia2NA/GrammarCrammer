import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/constants/theme';

export interface AnimatedTabbedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface AnimatedTabbedProps<T extends string> {
  tabs: readonly AnimatedTabbedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  variant?: 'subtle' | 'primary';
  className?: string;
  children?: ReactNode;
}

export function AnimatedTabbed<T extends string>({
  tabs,
  value,
  onChange,
  disabled = false,
  variant = 'subtle',
  className = '',
  children,
}: AnimatedTabbedProps<T>) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const [displayedValue, setDisplayedValue] = useState(value);
  const [displayedChildren, setDisplayedChildren] = useState(children);
  const [hasMeasuredHeight, setHasMeasuredHeight] = useState(false);
  const [heightAnimating, setHeightAnimating] = useState(false);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateX = useRef(new Animated.Value(0)).current;
  const contentHeight = useRef(new Animated.Value(0)).current;
  const contentTransition = useRef<Animated.CompositeAnimation | null>(null);
  const heightTransition = useRef<Animated.CompositeAnimation | null>(null);
  const contentHeightRef = useRef(0);
  const hasMeasuredContentRef = useRef(false);
  const pendingFadeInRef = useRef(false);
  const selectedIndex = Math.max(0, tabs.findIndex(tab => tab.value === value));
  const displayedIndex = Math.max(0, tabs.findIndex(tab => tab.value === displayedValue));
  const tabWidth = tabs.length > 0 && width > 0 ? (width - 8) / tabs.length : 0;
  const isPrimaryVariant = variant === 'primary';
  const hasContent = children !== undefined;

  useEffect(() => {
    if (tabWidth <= 0) return;
    Animated.timing(indicatorX, {
      toValue: selectedIndex * tabWidth,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [indicatorX, selectedIndex, tabWidth]);

  const startFadeIn = useCallback(() => {
    contentTransition.current?.stop();
    contentTransition.current = Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    contentTransition.current.start();
  }, [contentOpacity, contentTranslateX]);

  useEffect(() => {
    if (!hasContent) return;
    if (value !== displayedValue) return;
    setDisplayedChildren(children);
  }, [children, displayedValue, hasContent, value]);

  useEffect(() => {
    if (!hasContent || value === displayedValue) return;

    const direction = selectedIndex > displayedIndex ? 1 : -1;
    const exitOffset = direction * -16;
    const enterOffset = direction * 16;

    contentTransition.current?.stop();
    contentTransition.current = Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: exitOffset,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    contentTransition.current.start(({ finished }) => {
      if (!finished) return;
      setDisplayedValue(value);
      setDisplayedChildren(children);
      contentOpacity.setValue(0);
      contentTranslateX.setValue(enterOffset);
      pendingFadeInRef.current = true;
    });
  }, [children, contentOpacity, contentTranslateX, displayedIndex, displayedValue, hasContent, selectedIndex, value]);

  useEffect(() => () => {
    contentTransition.current?.stop();
    heightTransition.current?.stop();
  }, []);

  const handleContentLayout = useCallback((nextHeight: number) => {
    if (nextHeight <= 0) return;
    if (!hasMeasuredContentRef.current) {
      hasMeasuredContentRef.current = true;
      contentHeightRef.current = nextHeight;
      contentHeight.setValue(nextHeight);
      setHasMeasuredHeight(true);
      return;
    }

    if (Math.abs(contentHeightRef.current - nextHeight) < 1) {
      if (pendingFadeInRef.current) {
        pendingFadeInRef.current = false;
        startFadeIn();
      }
      return;
    }

    contentHeightRef.current = nextHeight;
    heightTransition.current?.stop();
    setHeightAnimating(true);
    heightTransition.current = Animated.timing(contentHeight, {
      toValue: nextHeight,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    heightTransition.current.start(({ finished }) => {
      setHeightAnimating(false);
      if (!finished) return;
      if (pendingFadeInRef.current) {
        pendingFadeInRef.current = false;
        startFadeIn();
      }
    });
  }, [contentHeight, startFadeIn]);

  return (
    <>
      <View
        className={`flex-row bg-background-muted border border-border rounded-xl p-1 relative ${className}`}
        onLayout={event => setWidth(event.nativeEvent.layout.width)}
      >
        {tabWidth > 0 && (
          <Animated.View
            className="rounded-lg"
            style={{
              position: 'absolute',
              top: 4,
              bottom: 4,
              left: 4,
              width: tabWidth,
              borderRadius: 8,
              backgroundColor: isPrimaryVariant ? colors.primary : colors.surface,
              borderColor: colors.primary,
              borderWidth: isPrimaryVariant ? 0 : 1,
              transform: [{ translateX: indicatorX }],
            }}
          />
        )}
        {tabs.map(tab => {
          const selected = tab.value === value;
          const tabDisabled = disabled || tab.disabled;
          const textColor = selected
            ? isPrimaryVariant ? colors.primary_foreground : colors.primary
            : isPrimaryVariant ? colors.primary : colors.foreground_secondary;
          return (
            <TouchableOpacity
              key={tab.value}
              className={`flex-1 py-2.5 rounded-lg items-center ${tabDisabled ? 'opacity-60' : ''}`}
              style={{ zIndex: 1 }}
              onPress={() => {
                if (!selected) onChange(tab.value);
              }}
              disabled={tabDisabled}
              activeOpacity={0.75}
              accessibilityState={{ selected, disabled: tabDisabled }}
            >
              <Text className="text-sm font-semibold" style={{ color: textColor }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {hasContent && (
        <Animated.View
          style={{
            opacity: contentOpacity,
            transform: [{ translateX: contentTranslateX }],
          }}
        >
          <Animated.View
            style={[
              { overflow: heightAnimating ? 'hidden' : 'visible' },
              hasMeasuredHeight ? { height: contentHeight } : null,
            ]}
          >
            <View onLayout={event => handleContentLayout(event.nativeEvent.layout.height)}>
              {displayedChildren}
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </>
  );
}
