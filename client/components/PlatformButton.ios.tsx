import { PlatformButtonNativeView } from 'platform-button';
import { SF_SYMBOL_MAP } from '@/components/Icon.types';
import type { PlatformButtonProps, PlatformButtonVariant } from './PlatformButton';

export function PlatformButton({
  text,
  icon,
  onPress,
  disabled = false,
  variant,
  color,
  backgroundColor,
  disabledColor,
  style,
  fontSize = text ? 17 : undefined,
  fontWeight = 'regular',
  iconSize = 18,
  horizontalPadding,
  verticalPadding,
  cornerRadius,
  contentAlignment,
  accessibilityLabel,
}: PlatformButtonProps) {
  const resolvedVariant = variant ?? (text ? 'glass' : 'plain');

  return (
    <PlatformButtonNativeView
      text={text}
      symbolName={icon ? SF_SYMBOL_MAP[icon] : undefined}
      variant={normalizeVariant(resolvedVariant)}
      disabled={disabled}
      foregroundColor={color}
      backgroundColor={backgroundColor}
      disabledForegroundColor={disabledColor}
      fontSize={fontSize}
      fontWeight={fontWeight}
      horizontalPadding={horizontalPadding}
      verticalPadding={verticalPadding}
      iconPointSize={iconSize}
      cornerRadius={cornerRadius}
      contentAlignment={contentAlignment}
      accessibilityLabel={accessibilityLabel ?? text}
      onButtonPress={onPress}
      style={style as object}
    />
  );
}

function normalizeVariant(variant: PlatformButtonVariant) {
  return variant;
}
