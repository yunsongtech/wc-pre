import { useEffect, useState } from 'react';
import { subscribeMatchSSE } from '../api/client';
import type { SSEPayload } from '../api/types';

export function useLiveMatch(matchId: string, enabled: boolean) {
  const [payload, setPayload] = useState<SSEPayload | null>(null);

  useEffect(() => {
    if (!enabled || !matchId) return;
    return subscribeMatchSSE(matchId, setPayload);
  }, [matchId, enabled]);

  const threatPercent = payload ? Math.round(payload.lts * 100) : 0;
  const ei = payload?.ei ?? 0;
  const history = payload?.threatHistory ?? [];
  const alarmTrigger = payload?.alarmTrigger ?? null;

  return { payload, threatPercent, ei, history, alarmTrigger };
}
