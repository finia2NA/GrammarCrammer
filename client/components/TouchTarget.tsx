import { type ReactNode } from 'react';
import { TouchableOpacity, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native';

interface TouchTargetProps {
  onPress: () => void;
  children: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}

const defaultStyle: ViewStyle = {
  paddingVertical: 8,
  paddingHorizontal: 12,
};

export function TouchTarget({
  onPress,
  children,
  disabled,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
}: TouchTargetProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      style={[defaultStyle, style]}
    >
      {children}
    </TouchableOpacity>
  );
}
