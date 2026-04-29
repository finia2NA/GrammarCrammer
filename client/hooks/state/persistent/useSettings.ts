import { useMemo } from 'react';
import { DEFAULT_LANGUAGES } from '@/constants/session';
import { parseEnabledLanguages } from '@/lib/api';
import { useSettingsStore } from './settingsStore';

export function useSettings() {
  return useSettingsStore(state => state.settings);
}

export function useSetting(key: string): string | null {
  return useSettingsStore(state => state.settings[key] ?? null);
}

export function useEnabledLanguages(defaultLanguages: string[] = DEFAULT_LANGUAGES): string[] {
  const raw = useSetting('enabled_languages');
  return useMemo(
    () => parseEnabledLanguages(raw, defaultLanguages),
    [raw, defaultLanguages],
  );
}
