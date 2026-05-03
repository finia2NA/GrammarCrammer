import { requireNativeViewManager } from 'expo-modules-core';

export interface PlatformButtonNativeViewProps {
  text?: string;
  symbolName?: string;
  variant?: 'plain' | 'filled' | 'gray' | 'tinted' | 'glass' | 'prominentGlass' | 'clearGlass' | 'prominentClearGlass';
  disabled?: boolean;
  foregroundColor?: string;
  backgroundColor?: string;
  disabledForegroundColor?: string;
  fontSize?: number;
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
  horizontalPadding?: number;
  verticalPadding?: number;
  iconPointSize?: number;
  cornerRadius?: number;
  contentAlignment?: 'left' | 'center' | 'right';
  accessibilityLabel?: string;
  onButtonPress?: () => void;
  style?: object;
}

const NativeView: React.ComponentType<PlatformButtonNativeViewProps> =
  requireNativeViewManager('PlatformButton');

export const PlatformButtonNativeView = NativeView;
