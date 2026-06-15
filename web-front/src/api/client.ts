import type {
  LegacyPrediction,
  PredictionResult,
  RadarComparison,
  SleepGuardAdvice,
} from './types';

const BASE = '/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function predictMatch(matchId: string): Promise<PredictionResult> {
  return request(`${BASE}/matches/${matchId}/predict`, { method: 'POST' });
}

export async function predictMatchLegacy(body: {
  matchId: string;
  homeTeam: { name: string; strength?: number; attackStyle?: string };
  awayTeam: { name: string; strength?: number; attackStyle?: string };
}): Promise<LegacyPrediction> {
  return request('/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function fetchRadar(matchId: string): Promise<RadarComparison> {
  return request(`${BASE}/matches/${matchId}/radar`);
}

export async function fetchSleepGuard(matchId: string): Promise<SleepGuardAdvice> {
  return request(`${BASE}/alarms/sleep-guard/${matchId}`);
}

export async function iotWakeupAction(userId: string, matchId: string) {
  return request('/api/v1/iot/wakeup-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, matchId, action: 'wakeup' }),
  });
}

export async function iotGoalCelebration(userId: string, matchId: string) {
  return request('/api/v1/iot/goal-celebration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, matchId, action: 'goal' }),
  });
}

export function subscribeMatchSSE(
  matchId: string,
  onMessage: (data: import('./types').SSEPayload) => void,
  onError?: (err: Event) => void
): () => void {
  const es = new EventSource(`${BASE}/sse/matches/${matchId}`);
  es.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data));
    } catch {
      // ignore malformed frames
    }
  };
  es.onerror = (err) => onError?.(err);
  return () => es.close();
}
