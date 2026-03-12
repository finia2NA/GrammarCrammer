import { requireNativeViewManager } from 'expo-modules-core';

export interface PillDropdownNativeViewProps {
  label: string;
  options: string[];
  selectedIndex: number;
  onValueChange: (event: { nativeEvent: { index: number } }) => void;
  style?: object;
}

const NativeView: React.ComponentType<PillDropdownNativeViewProps> =
  requireNativeViewManager('PillDropdown');

export const PillDropdownNativeView = NativeView;
