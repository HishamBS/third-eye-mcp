import type {
  PipelineEvent,
  SessionDetail,
  SessionOverview,
  SessionSettingsPayload,
  SessionSummary,
} from '../types/pipeline';

const DEFAULT_BASE_URL = 'http://localhost:7070';

function buildBaseUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_API_URL as string | undefined;
  return candidate?.replace(/\/$/, '') || DEFAULT_BASE_URL;
}

function buildHeaders(apiKey: string, requestId?: string) {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-Request-ID': requestId ?? crypto.randomUUID(),
  };
}

export async function fetchEvents(options: {
  sessionId: string;
  apiKey: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<PipelineEvent[]> {
  const { sessionId, apiKey, limit = 200, signal } = options;
  const base = buildBaseUrl();
  const url = `${base}/api/session/${encodeURIComponent(sessionId)}/events?limit=${limit}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(apiKey),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to load events (${response.status})`);
  }
  const payload = await response.json();
  return Array.isArray(payload.items) ? (payload.items as PipelineEvent[]) : [];
}

export async function submitClarifications(options: {
  sessionId: string;
  apiKey: string;
  answersMd: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  const { sessionId, apiKey, answersMd, context } = options;
  const base = buildBaseUrl();
  const response = await fetch(`${base}/api/session/${encodeURIComponent(sessionId)}/clarifications`, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ answers_md: answersMd, context }),
  });
  if (!response.ok) {
    throw new Error(`Clarifications submission failed (${response.status})`);
  }
}

export async function updateSessionSettings(options: {
  sessionId: string;
  apiKey: string;
  settings: SessionSettingsPayload;
}): Promise<SessionSettingsPayload> {
  const { sessionId, apiKey, settings } = options;
  const base = buildBaseUrl();
  const response = await fetch(`${base}/api/session/${encodeURIComponent(sessionId)}/settings`, {
    method: 'PUT',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error(`Settings update failed (${response.status})`);
  }
  const payload = await response.json();
  return (payload?.data ?? settings) as SessionSettingsPayload;
}

export async function postKillSwitch(options: {
  sessionId: string;
  apiKey: string;
  draftMd: string;
  topic: string;
  context?: Record<string, unknown>;
}): Promise<{ tenseigan: unknown; byakugan: unknown }> {
  const { sessionId, apiKey, draftMd, topic, context } = options;
  const base = buildBaseUrl();
  const response = await fetch(`${base}/api/session/${encodeURIComponent(sessionId)}/revalidate`, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ draft_md: draftMd, topic, context }),
  });
  if (!response.ok) {
    throw new Error(`Kill switch invocation failed (${response.status})`);
  }
  return response.json();
}

export function buildWebSocketUrl(sessionId: string, apiKey?: string): string {
  const base = buildBaseUrl();
  let wsBase: string;
  if (base.toLowerCase().startsWith('https://')) {
    wsBase = base.replace(/^https:/i, 'wss:');
  } else if (base.toLowerCase().startsWith('http://')) {
    wsBase = base.replace(/^http:/i, 'ws:');
  } else {
    wsBase = `ws://${base.replace(/^\/+/, '')}`;
  }
  const url = new URL(`${wsBase}/ws/monitor?sessionId=${encodeURIComponent(sessionId)}`);
  if (apiKey) {
    url.searchParams.set('api_key', apiKey);
  }
  return url.toString();
}

export async function postResubmitRequest(options: {
  sessionId: string;
  apiKey: string;
  eye: string;
  context?: Record<string, unknown>;
  notes?: string;
}): Promise<void> {
  const { sessionId, apiKey, eye, context, notes } = options;
  const base = buildBaseUrl();
  const response = await fetch(`${base}/api/session/${encodeURIComponent(sessionId)}/resubmit`, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ eye, context, notes }),
  });
  if (!response.ok) {
    throw new Error(`Resubmit request failed (${response.status})`);
  }
}

export interface LeaderboardSummary {
  agents: Array<{ agent: string; approvals: number; rejections: number; total: number; win_rate: number }>;
  eyes: Array<{ eye: string; approvals: number; rejections: number; total: number; win_rate: number }>;
}

export async function fetchLeaderboard(options: { sessionId: string; apiKey: string }): Promise<LeaderboardSummary> {
  const { sessionId, apiKey } = options;
  const base = buildBaseUrl();
  const response = await fetch(`${base}/api/session/${encodeURIComponent(sessionId)}/leaderboard`, {
    method: 'GET',
    headers: buildHeaders(apiKey),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch leaderboard (${response.status})`);
  }
  return response.json() as Promise<LeaderboardSummary>;
}

export async function fetchSessions(options: {
  apiKey: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<SessionOverview[]> {
  const { apiKey, limit = 20, signal } = options;
  const base = buildBaseUrl();
  const response = await fetch(`${base}/api/session?limit=${limit}`, {
    method: 'GET',
    headers: buildHeaders(apiKey),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sessions (${response.status})`);
  }
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.items)) {
    return [];
  }
  return payload.items as SessionOverview[];
}

export async function fetchSessionDetail(options: {
  apiKey: string;
  sessionId: string;
  signal?: AbortSignal;
}): Promise<SessionDetail> {
  const { apiKey, sessionId, signal } = options;
  const base = buildBaseUrl();
  const response = await fetch(`${base}/api/session/${encodeURIComponent(sessionId)}`, {
    method: 'GET',
    headers: buildHeaders(apiKey),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch session detail (${response.status})`);
  }
  return response.json() as Promise<SessionDetail>;
}

export async function fetchSessionSummary(options: {
  apiKey: string;
  sessionId: string;
  signal?: AbortSignal;
}): Promise<SessionSummary> {
  const { apiKey, sessionId, signal } = options;
  const base = buildBaseUrl();
  const response = await fetch(`${base}/api/session/${encodeURIComponent(sessionId)}/summary`, {
    method: 'GET',
    headers: buildHeaders(apiKey),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch session summary (${response.status})`);
  }
  return response.json() as Promise<SessionSummary>;
}
