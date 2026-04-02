import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { getAuthToken, clearAuthToken } from './storage';
import type { Card, TreeNode, DeckData, ChatMessage } from './types';

function getBaseUrl(): string {
  if (Platform.OS === 'web' && !__DEV__) {
    // Production web: same origin, nginx proxies /api → Express
    return '/api';
  }
  // Dev (all platforms) and native prod: use configured host
  const host = Constants.expoConfig?.extra?.devServerHost ?? 'localhost';
  const port = Constants.expoConfig?.extra?.devServerPort ?? '3001';
  return `http://${host}:${port}/api`;
}

const BASE_URL = getBaseUrl();

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function getHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export class ApiError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!res.ok) {
    if (res.status === 401) {
      await clearAuthToken();
      router.replace('/onboarding');
      throw new ApiError('Session expired', 401, 'INVALID_TOKEN');
    }
    const body = await res.json().catch(() => ({})) as any;
    const message = body?.error?.message ?? `HTTP ${res.status}`;
    const code = body?.error?.code;
    throw new ApiError(message, res.status, code);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function register(email: string, password: string) {
  return request<{ token: string; user: { id: string; email: string | null } }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string) {
  return request<{ token: string; user: { id: string; email: string | null } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function loginWithApple(identityToken: string) {
  return request<{ token: string; user: { id: string; email: string | null } }>('/auth/apple', {
    method: 'POST',
    body: JSON.stringify({ identityToken }),
  });
}

export async function loginWithGoogle(idToken: string) {
  return request<{ token: string; user: { id: string; email: string | null } }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export async function getMe() {
  return request<{ id: string; email: string | null; hasApiKey: boolean; centralKeyAvailable: boolean; authMethods: string[] }>('/auth/me');
}

export async function validateApiKey(apiKey: string) {
  return request<{ valid: boolean; error?: string }>('/auth/validate-key', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  });
}

// ─── API Key ──────────────────────────────────────────────────────────────────

export async function setApiKey(apiKey: string) {
  return request<{ success: boolean }>('/settings/api-key', {
    method: 'PUT',
    body: JSON.stringify({ apiKey }),
  });
}

export async function deleteApiKey() {
  return request<{ success: boolean }>('/settings/api-key', { method: 'DELETE' });
}

export async function getApiKeyStatus() {
  return request<{ hasKey: boolean }>('/settings/api-key/status');
}

// ─── Tree ─────────────────────────────────────────────────────────────────────

export async function getTree() {
  return request<TreeNode[]>('/tree');
}

export async function getNode(id: string) {
  return request<TreeNode>(`/tree/${id}`);
}

export async function getNodePath(id: string) {
  return request<{ path: string }>(`/tree/${id}/path`).then(r => r.path);
}

export async function getDescendantDeckIds(nodeId: string) {
  return request<{ deckIds: string[] }>(`/tree/${nodeId}/descendant-deck-ids`).then(r => r.deckIds);
}

export async function deleteNode(nodeId: string) {
  return request<{ success: boolean }>(`/nodes/${nodeId}`, { method: 'DELETE' });
}

// ─── Decks ────────────────────────────────────────────────────────────────────

export async function createDeckFromPath(path: string, topic: string, language: string, cardCount = 10) {
  return request<{ nodeId: string }>('/decks', {
    method: 'POST',
    body: JSON.stringify({ path, topic, language, cardCount }),
  }).then(r => r.nodeId);
}

export async function getDeck(nodeId: string) {
  return request<DeckData>(`/decks/${nodeId}`);
}

export async function updateDeck(nodeId: string, updates: { name?: string; topic?: string; language?: string; cardCount?: number }) {
  return request<{ regenerateExplanation: boolean }>(`/decks/${nodeId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function markStudied(nodeId: string) {
  return request<{ success: boolean }>(`/decks/${nodeId}/mark-studied`, { method: 'POST' });
}

// ─── Collections ──────────────────────────────────────────────────────────────

export async function renameCollection(nodeId: string, name: string) {
  return request<{ success: boolean }>(`/collections/${nodeId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function moveNode(nodeId: string, newPath: string) {
  return request<{ success: boolean }>(`/nodes/${nodeId}/move`, {
    method: 'POST',
    body: JSON.stringify({ newPath }),
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSetting(key: string) {
  return request<{ value: string | null }>(`/settings/${key}`).then(r => r.value);
}

export async function setSetting(key: string, value: string) {
  return request<{ success: boolean }>(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export interface UsageStatus {
  centralKeyAvailable: boolean;
  preference: 'central' | 'own';
  hasOwnKey: boolean;
  userLimit: number;
  globalLimit: number;
  globalLimitReached: boolean;
  usage: { central: number; own: number };
}

export async function getUsageStatus() {
  return request<UsageStatus>('/settings/usage-status');
}

// ─── AI (non-streaming) ──────────────────────────────────────────────────────

export async function generateCards(topic: string, language: string, count: number, explanation: string) {
  return request<{ cards: Card[]; cost: number }>('/ai/cards', {
    method: 'POST',
    body: JSON.stringify({ topic, language, count, explanation }),
  });
}

export async function judgeAnswer(card: Card, userAnswer: string, language: string, explanation?: string) {
  return request<{ correct: boolean; reason: string; cost: number }>('/ai/judge', {
    method: 'POST',
    body: JSON.stringify({ card, userAnswer, language, explanation }),
  });
}

// ─── AI (streaming via SSE) ──────────────────────────────────────────────────

async function streamSSE(
  path: string,
  body: object,
  onChunk: (text: string) => void,
  onCost?: (usd: number) => void,
): Promise<{ wasTruncated?: boolean }> {
  const headers = await getHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 401) {
      await clearAuthToken();
      router.replace('/onboarding');
      throw new ApiError('Session expired', 401, 'INVALID_TOKEN');
    }
    const err = await res.json().catch(() => ({})) as any;
    const message = err?.error?.message ?? `HTTP ${res.status}`;
    const code = err?.error?.code;
    throw new ApiError(message, res.status, code);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let wasTruncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;
      try {
        const ev = JSON.parse(jsonStr);
        if (ev.type === 'text') {
          onChunk(ev.text);
        } else if (ev.type === 'done') {
          if (ev.cost) onCost?.(ev.cost);
          if (ev.wasTruncated) wasTruncated = true;
        } else if (ev.type === 'error') {
          throw new Error(ev.message);
        }
      } catch (e) {
        if (e instanceof Error && e.message !== 'Unknown error') throw e;
      }
    }
  }

  return { wasTruncated };
}

export async function generateExplanation(
  topic: string,
  language: string,
  onChunk: (text: string) => void,
  onCost?: (usd: number) => void,
): Promise<{ wasTruncated: boolean }> {
  const result = await streamSSE('/ai/explanation/stream', { topic, language }, onChunk, onCost);
  return { wasTruncated: result.wasTruncated ?? false };
}

export async function explainRejection(card: Card, userAnswer: string, language: string) {
  return request<{ explanation: string; overrideToCorrect: boolean; cost: number }>('/ai/rejection', {
    method: 'POST',
    body: JSON.stringify({ card, userAnswer, language }),
  });
}

export async function chatAboutCard(
  card: Card,
  userAnswer: string,
  language: string,
  wasCorrect: boolean,
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onCost?: (usd: number) => void,
  explanation?: string,
): Promise<void> {
  await streamSSE('/ai/chat/stream', { card, userAnswer, language, wasCorrect, messages, explanation }, onChunk, onCost);
}
