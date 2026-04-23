import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  AUTH_TOKEN: 'auth_token',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  COLLAPSED_NODES: 'collapsed_nodes',
} as const;

export async function getAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.AUTH_TOKEN);
}

export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.AUTH_TOKEN, token);
}

export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.AUTH_TOKEN);
}

export async function isOnboardingComplete(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDING_COMPLETE);
  return val === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDING_COMPLETE, 'true');
}

export async function getCollapsedNodes(): Promise<Set<string>> {
  const val = await AsyncStorage.getItem(KEYS.COLLAPSED_NODES);
  if (!val) return new Set();
  try {
    return new Set(JSON.parse(val) as string[]);
  } catch {
    return new Set();
  }
}

export async function setCollapsedNodes(ids: Set<string>): Promise<void> {
  await AsyncStorage.setItem(KEYS.COLLAPSED_NODES, JSON.stringify([...ids]));
}
