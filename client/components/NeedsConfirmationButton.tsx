import { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { useColors } from '@/constants/theme';

interface NeedsConfirmationButtonProps {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}

export function NeedsConfirmationButton({
  label,
  confirmLabel,
  onConfirm,
  destructive,
}: NeedsConfirmationButtonProps) {
  const colors = useColors();
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fill, {
      toValue: armed ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [armed, fill]);

  function handlePress() {
    if (armed) {
      if (timer.current) clearTimeout(timer.current);
      setArmed(false);
      onConfirm();
    } else {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
    }
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const bgColor = fill.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', destructive ? colors.error : colors.foreground],
  });

  const textColor = fill.interpolate({
    inputRange: [0, 1],
    outputRange: [destructive ? colors.error : colors.foreground, destructive ? '#ffffff' : colors.background],
  });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={{
          paddingVertical: 14,
          borderRadius: 12,
          borderWidth: 1,
          alignItems: 'center' as const,
          backgroundColor: bgColor,
          borderColor: destructive ? colors.error : colors.border,
        }}
      >
        <Animated.Text style={{ color: textColor, fontWeight: '600' }}>
          {armed ? confirmLabel : label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}
