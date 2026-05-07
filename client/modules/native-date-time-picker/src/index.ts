import { requireNativeModule } from 'expo-modules-core';

export type NativeDateTimePickerMode = 'date' | 'time';
export type NativeDateTimePickerAction = 'confirmed' | 'cancelled' | 'dismissed' | 'reset';

export interface NativeDateTimePickerOptions {
  mode: NativeDateTimePickerMode;
  value: string;
  title: string;
  cancelText: string;
  confirmText: string;
  is24Hour?: boolean;
  minuteInterval?: number;
  accentColor?: string;
  foregroundColor?: string;
  sheetBackgroundColor?: string;
  panelBackgroundColor?: string;
  resetText?: string;
  resetArmedText?: string;
  resetTextColor?: string;
}

export interface NativeDateTimePickerResult {
  action: NativeDateTimePickerAction;
  value?: string;
}

interface NativeDateTimePickerModule {
  present(options: NativeDateTimePickerOptions): Promise<NativeDateTimePickerResult>;
  updateAppearance(options: Partial<NativeDateTimePickerOptions>): Promise<void>;
}

let nativeModule: NativeDateTimePickerModule | null | undefined;

export function getNativeDateTimePicker() {
  if (nativeModule !== undefined) return nativeModule;

  try {
    nativeModule = requireNativeModule<NativeDateTimePickerModule>('NativeDateTimePicker');
  } catch {
    nativeModule = null;
  }

  return nativeModule;
}
