import { Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Icon } from '@/components/Icon';
import { TouchTarget } from '@/components/TouchTarget';
import type { SemanticIcon } from '@/components/Icon.types';

export type PlatformButtonVariant =
  | 'plain'
  | 'filled'
  | 'gray'
  | 'tinted'
  | 'glass'
  | 'prominentGlass'
  | 'clearGlass'
  | 'prominentClearGlass';
export type PlatformButtonFontWeight = 'regular' | 'medium' | 'semibold' | 'bold';

interface SharedPlatformButtonProps {
  onPress: () => void;
  disabled?: boolean;
  variant?: PlatformButtonVariant;
  color?: string;
  backgroundColor?: string;
  disabledColor?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fontSize?: number;
  fontWeight?: PlatformButtonFontWeight;
  iconSize?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  cornerRadius?: number;
  contentAlignment?: 'left' | 'center' | 'right';
  accessibilityLabel?: string;
}

type TextPlatformButtonProps = SharedPlatformButtonProps & {
  text: string;
  icon?: never;
};

type IconPlatformButtonProps = SharedPlatformButtonProps & {
  icon: SemanticIcon;
  text?: never;
};

export type PlatformButtonProps = TextPlatformButtonProps | IconPlatformButtonProps;

export function PlatformButton({
  text,
  icon,
  onPress,
  disabled = false,
  color,
  backgroundColor,
  disabledColor,
  style,
  textStyle,
  iconSize = 18,
  horizontalPadding,
  verticalPadding,
  cornerRadius,
  contentAlignment,
  accessibilityLabel,
}: PlatformButtonProps) {
  const resolvedColor = disabled ? disabledColor : color;

  return (
    <TouchTarget
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? text}
      style={[
        backgroundColor ? { backgroundColor } : undefined,
        horizontalPadding !== undefined ? { paddingHorizontal: horizontalPadding } : undefined,
        verticalPadding !== undefined ? { paddingVertical: verticalPadding } : undefined,
        cornerRadius !== undefined ? { borderRadius: cornerRadius } : undefined,
        contentAlignment ? { alignItems: contentAlignment === 'left' ? 'flex-start' : contentAlignment === 'right' ? 'flex-end' : 'center' } : undefined,
        style,
      ]}
    >
      {icon ? (
        <Icon name={icon} size={iconSize} color={resolvedColor} />
      ) : (
        <Text style={[textStyle, resolvedColor ? { color: resolvedColor } : undefined]}>
          {text}
        </Text>
      )}
    </TouchTarget>
  );
}
