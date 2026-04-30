import { type ReactNode } from 'react';
import { TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';

interface TouchTargetProps {
  onPress: () => void;
  children: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const defaultStyle: ViewStyle = {
  paddingVertical: 8,
  paddingHorizontal: 12,
};

export function TouchTarget({ onPress, children, disabled, style }: TouchTargetProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}
      style={[defaultStyle, style]}
    >
      {children}
    </TouchableOpacity>
  );
}
