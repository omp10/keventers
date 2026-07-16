import { useSyncExternalStore } from 'react';

/**
 * useTick — a SHARED 1-second clock. One interval drives every on-screen timer, so
 * a board with dozens of order cards has a single timer, not dozens. Returns the
 * current epoch ms, updated each second. This is a DISPLAY clock (no network) — the
 * authoritative elapsed/SLA values still come from the backend.
 */
let now = Date.now();
const subs = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function start() {
  if (timer) return;
  timer = setInterval(() => {
    now = Date.now();
    subs.forEach((f) => f());
  }, 1000);
}

export function useTick(): number {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      start();
      return () => {
        subs.delete(cb);
        if (subs.size === 0 && timer) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    () => now,
    () => now,
  );
}
