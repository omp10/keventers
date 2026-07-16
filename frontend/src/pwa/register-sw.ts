import { env } from '@/config/env';

/**
 * Registers the PWA service worker. Only in production builds (dev + a caching SW
 * fight each other). Safe no-op where service workers are unsupported.
 */
export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!env.isProd) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* registration is best-effort */
    });
  });
}
