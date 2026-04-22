/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColors } from '@/constants/theme';
import type { ThemePalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ThemePalette
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];
  const colors = useColors();

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return colors[colorName];
  }
}
