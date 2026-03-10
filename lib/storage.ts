import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  API_KEY: 'claude_api_key',
  ONBOARDING_COMPLETE: 'onboarding_complete',
} as const;

export async function getApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.API_KEY);
}

export async function setApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.API_KEY, key);
}

export async function clearApiKey(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.API_KEY);
}

export async function isOnboardingComplete(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
  return val === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, 'true');
}
