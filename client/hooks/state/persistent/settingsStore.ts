import { create } from 'zustand';
import { SETTING_DEFAULTS } from '@/constants/session';

export type SettingsMap = Record<string, string>;

interface SettingsState {
  settings: SettingsMap;
  hydrated: boolean;
  replaceSettings: (settings: SettingsMap, hydrated?: boolean) => void;
  setSetting: (key: string, value: string) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...SETTING_DEFAULTS },
  hydrated: false,
  replaceSettings: (settings, hydrated = true) => set({
    settings: { ...SETTING_DEFAULTS, ...settings },
    hydrated,
  }),
  setSetting: (key, value) => set((state) => ({
    settings: { ...state.settings, [key]: value },
  })),
  resetSettings: () => set({
    settings: { ...SETTING_DEFAULTS },
    hydrated: false,
  }),
}));

export function getSettingsSnapshot(): SettingsMap {
  return useSettingsStore.getState().settings;
}

export function getLocalSetting(key: string): string | null {
  return getSettingsSnapshot()[key] ?? null;
}

export function areSettingsHydrated(): boolean {
  return useSettingsStore.getState().hydrated;
}

export function replaceLocalSettings(settings: SettingsMap, hydrated = true): void {
  useSettingsStore.getState().replaceSettings(settings, hydrated);
}

export function setLocalSetting(key: string, value: string): void {
  useSettingsStore.getState().setSetting(key, value);
}

export function resetLocalSettings(): void {
  useSettingsStore.getState().resetSettings();
}
