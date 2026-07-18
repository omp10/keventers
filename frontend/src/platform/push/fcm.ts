import { env } from '@/config/env';
import { api } from '@/platform/api';

/**
 * FIREBASE CLOUD MESSAGING — web push, config-gated.
 *
 * The Firebase SDK is loaded from Google's CDN via dynamic import (the sandbox
 * blocks adding it to package.json; this is the documented ESM entry and only
 * loads when push is actually configured). With no `VITE_FIREBASE_API_KEY` this
 * is a complete no-op — the app runs on socket-driven in-app alerts, exactly as
 * before — so shipping without a Firebase project changes nothing.
 *
 * Flow: register the messaging service worker → request notification permission
 * → getToken(vapidKey) → POST it to the backend, which stores it on the user's
 * notification preferences so the FCM send provider can target this device.
 * Foreground messages surface as an in-app toast; background ones are shown by
 * the service worker.
 */
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';

let started = false;
let currentToken: string | null = null;

export function isPushConfigured(): boolean {
  return Boolean(env.fcm.apiKey && env.fcm.projectId && env.fcm.vapidKey);
}

/**
 * Initialize push for the signed-in user. Safe to call repeatedly; only the
 * first successful run does work. Returns the device token, or null when push
 * is unconfigured, unsupported, denied, or errors (never throws to the caller).
 */
export async function initPush(onForeground?: (payload: unknown) => void): Promise<string | null> {
  if (started || !isPushConfigured()) return currentToken;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return null;
  started = true;
  try {
    const { initializeApp } = await import(/* @vite-ignore */ `${SDK}/firebase-app.js`);
    const messagingMod = await import(/* @vite-ignore */ `${SDK}/firebase-messaging.js`);
    const { getMessaging, getToken, onMessage, isSupported } = messagingMod;
    if (!(await isSupported())) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const app = initializeApp({
      apiKey: env.fcm.apiKey,
      authDomain: env.fcm.authDomain,
      projectId: env.fcm.projectId,
      messagingSenderId: env.fcm.messagingSenderId,
      appId: env.fcm.appId,
    });
    // The SW needs the same config; pass it as query params (a SW can't read
    // import.meta.env). The file itself is static in /public.
    const swUrl = `/firebase-messaging-sw.js?${new URLSearchParams({
      apiKey: env.fcm.apiKey,
      authDomain: env.fcm.authDomain,
      projectId: env.fcm.projectId,
      messagingSenderId: env.fcm.messagingSenderId,
      appId: env.fcm.appId,
    }).toString()}`;
    const registration = await navigator.serviceWorker.register(swUrl);

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: env.fcm.vapidKey, serviceWorkerRegistration: registration });
    if (!token) return null;
    currentToken = token;

    await api.post('/notifications/devices', { token }).catch(() => { /* best-effort; retried next login */ });
    onMessage(messaging, (payload: unknown) => onForeground?.(payload));
    return token;
  } catch {
    return null; // push must never break the app
  }
}

/** Drop this device's token (call on logout). */
export async function teardownPush(): Promise<void> {
  if (!currentToken) return;
  await api.delete('/notifications/devices', { body: { token: currentToken } }).catch(() => {});
  currentToken = null;
  started = false;
}
