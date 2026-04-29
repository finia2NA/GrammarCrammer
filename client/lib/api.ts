import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { getAuthToken, clearAuthToken, getBackendBaseUrl } from './storage';
import type { Card, TreeNode, DeckData, ChatMessage, CardAttempt, WordHint } from './types';

function getConfiguredBaseUrl(): string {
  if (Platform.OS === 'web' && !__DEV__) {
    // Production web: same origin, nginx proxies /api → Express
    return '/api';
  }
  // Dev (all platforms) and native prod: use configured host
  const host = Constants.expoConfig?.extra?.devServerHost ?? 'localhost';
  const port = Constants.expoConfig?.extra?.devServerPort ?? '3001';
  return `http://${host}:${port}/api`;
}

async function getBaseUrl(): Promise<string> {
  const override = await getBackendBaseUrl();
  return override ?? getConfiguredBaseUrl();
}

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
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!res.ok) {
    if (res.status === 401) {
      await clearAuthToken();
      if (!options.signal?.aborted) router.replace('/onboarding');
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

export async function getTree(signal?: AbortSignal) {
  return request<TreeNode[]>('/tree', { signal });
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

export async function exportNodeCsv(nodeId: string) {
  return request<{ filename: string; csv: string }>(`/tree/${nodeId}/export-csv`);
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

export async function resetDeckToNeverStudied(nodeId: string) {
  return request<{ success: boolean }>(`/decks/${nodeId}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'reset_never_studied' }),
  });
}

export async function setDeckDueDate(nodeId: string, dueDate: string) {
  const clientTimezone = getDeviceTimezone();
  return request<{ success: boolean }>(`/decks/${nodeId}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'set_due_date', dueDate, clientTimezone }),
  });
}

export async function markStudied(nodeId: string) {
  return request<{ success: boolean }>(`/decks/${nodeId}/mark-studied`, { method: 'POST' });
}

export interface CsvImportResult {
  createdCount: number;
  queuedCount: number;
  failedCount: number;
  failures: Array<{ line: number; context: string; error: string }>;
}

export async function importDecksFromCsv(
  csvContent: string,
  collectionPath: string,
  language: string,
  cardCount: number,
): Promise<CsvImportResult> {
  const token = await getAuthToken();
  const baseUrl = await getBaseUrl();
  const formData = new FormData();
  formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'import.csv');
  formData.append('collectionPath', collectionPath);
  formData.append('language', language);
  formData.append('cardCount', String(cardCount));

  const res = await fetch(`${baseUrl}/decks/import-csv`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
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

  return res.json() as Promise<CsvImportResult>;
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

function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.trim().length > 0) return tz;
  } catch {}
  return 'UTC';
}

export async function syncReviewTimezone() {
  const tz = getDeviceTimezone();
  await setSetting('review_timezone', tz);
  return tz;
}

export async function getEnabledLanguages(defaultLanguages: string[]): Promise<string[]> {
  const raw = await getSetting('enabled_languages');
  if (!raw) return defaultLanguages;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
  } catch {}
  return defaultLanguages;
}

export async function setEnabledLanguages(langs: string[]): Promise<void> {
  await setSetting('enabled_languages', JSON.stringify(langs));
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

export async function judgeAnswer(card: Card, userAnswer: string, language: string, explanation?: string, brevity?: 'brief' | 'normal') {
  return request<{ correct: boolean; reason: string; cost: number }>('/ai/judge', {
    method: 'POST',
    body: JSON.stringify({ card, userAnswer, language, explanation, brevity }),
  });
}

export async function rateSession(topic: string, language: string, cards: CardAttempt[]) {
  const payload = cards.map(a => ({
    english: a.card.english,
    targetLanguage: a.card.targetLanguage,
    answers: a.answers,
  }));
  return request<{ stars: number; recap: string; cost: number }>('/ai/rate-session', {
    method: 'POST',
    body: JSON.stringify({ topic, language, cards: payload }),
  });
}

export async function submitDeckReview(
  nodeId: string,
  userStars: number,
  aiStars: number,
  aiRecap: string,
  studyMode: 'scheduled' | 'early' = 'scheduled',
) {
  return request<{ dueAt: number; nextIntervalDays: number }>(`/decks/${nodeId}/review`, {
    method: 'POST',
    body: JSON.stringify({ userStars, aiStars, aiRecap, studyMode }),
  });
}

// ─── AI (streaming via SSE) ──────────────────────────────────────────────────

function parseSSEBuffer(
  buffer: string,
  onChunk: (text: string) => void,
  onCost: ((usd: number) => void) | undefined,
  wasTruncated: { value: boolean },
): string {
  const lines = buffer.split('\n');
  const remaining = lines.pop() ?? '';
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
        if (ev.wasTruncated) wasTruncated.value = true;
      } else if (ev.type === 'error') {
        throw new Error(ev.message);
      }
    } catch (e) {
      if (e instanceof Error && e.message !== 'Unknown error') throw e;
    }
  }
  return remaining;
}

async function streamSSE(
  path: string,
  body: object,
  onChunk: (text: string) => void,
  onCost?: (usd: number) => void,
): Promise<{ wasTruncated?: boolean }> {
  const headers = await getHeaders();
  const baseUrl = await getBaseUrl();
  const url = `${baseUrl}${path}`;
  const wasTruncated = { value: false };

  // Web supports ReadableStream; native (iOS/Android) does not expose res.body reliably.
  if (Platform.OS === 'web') {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) {
      if (res.status === 401) {
        await clearAuthToken();
        router.replace('/onboarding');
        throw new ApiError('Session expired', 401, 'INVALID_TOKEN');
      }
      const err = await res.json().catch(() => ({})) as any;
      throw new ApiError(err?.error?.message ?? `HTTP ${res.status}`, res.status, err?.error?.code);
    }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = parseSSEBuffer(buffer, onChunk, onCost, wasTruncated);
    }
  } else {
    // XHR onprogress gives us incremental responseText on native.
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      let cursor = 0;
      let buffer = '';
      xhr.onprogress = () => {
        const newText = xhr.responseText.slice(cursor);
        cursor = xhr.responseText.length;
        buffer += newText;
        try {
          buffer = parseSSEBuffer(buffer, onChunk, onCost, wasTruncated);
        } catch (e) {
          reject(e);
        }
      };
      xhr.onload = () => {
        if (xhr.status === 401) {
          clearAuthToken().then(() => router.replace('/onboarding'));
          reject(new ApiError('Session expired', 401, 'INVALID_TOKEN'));
          return;
        }
        if (xhr.status >= 400) {
          let err: any = {};
          try { err = JSON.parse(xhr.responseText); } catch {}
          reject(new ApiError(err?.error?.message ?? `HTTP ${xhr.status}`, xhr.status, err?.error?.code));
          return;
        }
        resolve();
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send(JSON.stringify(body));
    });
  }

  return { wasTruncated: wasTruncated.value };
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

export async function explainRejection(card: Card, userAnswer: string, language: string, explanation?: string, brevity?: 'brief' | 'normal') {
  return request<{ explanation: string; overrideToCorrect: boolean; cost: number }>('/ai/rejection', {
    method: 'POST',
    body: JSON.stringify({ card, userAnswer, language, explanation, brevity }),
  });
}

export async function wordHint(
  word: string,
  english: string,
  targetLanguage: string,
  language: string,
): Promise<WordHint & { cost: number }> {
  return request('/ai/word-hint', {
    method: 'POST',
    body: JSON.stringify({ word, english, targetLanguage, language }),
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
