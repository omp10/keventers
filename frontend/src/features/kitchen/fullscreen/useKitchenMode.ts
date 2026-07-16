import { useCallback, useEffect, useRef, useState } from 'react';

type WakeLockSentinelLike = { release: () => Promise<void> };

/**
 * useKitchenMode — immersive full-screen kitchen display. Toggles the Fullscreen
 * API and requests a Screen Wake Lock (where supported) so the display never sleeps
 * or auto-refreshes during service. Re-acquires the wake lock when the tab becomes
 * visible again. All calls degrade gracefully where unsupported.
 */
export function useKitchenMode() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wakeLock = useRef<WakeLockSentinelLike | null>(null);
  const wantLock = useRef(false);

  const requestWakeLock = useCallback(async () => {
    try {
      const nav = navigator as unknown as { wakeLock?: { request: (t: string) => Promise<WakeLockSentinelLike> } };
      if (nav.wakeLock) wakeLock.current = await nav.wakeLock.request('screen');
    } catch {
      /* not supported / denied — display still works */
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLock.current?.release();
    } catch {
      /* ignore */
    }
    wakeLock.current = null;
  }, []);

  const enter = useCallback(async () => {
    wantLock.current = true;
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      /* some kiosks are already fullscreen */
    }
    await requestWakeLock();
  }, [requestWakeLock]);

  const exit = useCallback(async () => {
    wantLock.current = false;
    try {
      if (document.fullscreenElement) await document.exitFullscreen?.();
    } catch {
      /* ignore */
    }
    await releaseWakeLock();
  }, [releaseWakeLock]);

  const toggle = useCallback(() => (document.fullscreenElement ? exit() : enter()), [enter, exit]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    const onVisible = () => {
      if (wantLock.current && document.visibilityState === 'visible' && !wakeLock.current) void requestWakeLock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('visibilitychange', onVisible);
      void releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  return { isFullscreen, enter, exit, toggle };
}
