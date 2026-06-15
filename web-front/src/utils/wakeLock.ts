let wakeLock: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<boolean> {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        wakeLock = null;
      });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function reacquireWakeLockOnVisible(): Promise<void> {
  if (wakeLock !== null && document.visibilityState === 'visible') {
    await requestWakeLock();
  }
}

export function setupWakeLockVisibilityHandler(): () => void {
  const handler = () => {
    void reacquireWakeLockOnVisible();
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
