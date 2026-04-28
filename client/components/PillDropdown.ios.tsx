/**
 * iOS implementation of PillDropdown.
 *
 * Uses a local Expo module (modules/pill-dropdown) that wraps UIButton with
 * UIMenu + showsMenuAsPrimaryAction = true, giving the native floating popover.
 *
 * SWAP POINT: once @expo/ui ships a stable SwiftUI Menu for the current
 * Expo SDK, replace the NativePillDropdownView import with the @expo/ui
 * <Menu> component. The PillDropdownProps interface in PillDropdown.tsx
 * stays the same either way.
 */
import { useState, useEffect } from 'react';
import { Keyboard, Appearance } from 'react-native';
import { PillDropdownNativeView } from 'pill-dropdown';
import type { PillDropdownProps } from './PillDropdown';
import { useColors } from '@/constants/theme';

export function PillDropdown<T extends string | number>({
  value, options, onChange, formatLabel,
}: PillDropdownProps<T>) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => forceUpdate(n => n + 1));
    return () => sub.remove();
  }, []);

  const colors = useColors();
  const label = formatLabel ? formatLabel(value) : String(value);
  const optionLabels = options.map(o => formatLabel ? formatLabel(o) : String(o));
  const selectedIndex = options.findIndex(o => o === value);

  return (
    <PillDropdownNativeView
      label={label}
      options={optionLabels}
      selectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
      backgroundColor={colors.background_muted}
      foregroundColor={colors.foreground}
      onValueChange={(event) => {
        Keyboard.dismiss();
        onChange(options[event.nativeEvent.index]);
      }}
      // Yoga ignores UIKit intrinsicContentSize, so estimate width from label.
      // ~8.5px per char at 14pt medium + 48px for padding + chevron.
      style={{ height: 34, minWidth: Math.max(90, label.length * 8.5 + 48) }}
    />
  );
}
