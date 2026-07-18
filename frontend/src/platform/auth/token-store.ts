/**
 * TOKEN STORE — the single owner of auth tokens. The ACCESS token lives in memory
 * only (not localStorage — mitigates XSS token theft); the REFRESH + GUEST tokens
 * persist so sessions survive reloads. Everything auth-related reads/writes here;
 * the API client gets tokens via the injected adapter, never from storage.
 */
const REFRESH_KEY = 'kv-rt';
const GUEST_KEY = 'kv-gt';

let accessToken: string | null = null;
let refreshToken: string | null = safeGet(REFRESH_KEY);
let guestToken: string | null = safeGet(GUEST_KEY);

/**
 * Change listeners. Consumers that hold live connections keyed to the token
 * (the socket client re-authenticating, for one) subscribe here — React auth
 * STATE isn't enough, because guest ordering sessions write tokens directly to
 * this store without going through the AuthProvider.
 */
const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* one bad listener must not break the rest */
    }
  }
}

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh: () => refreshToken,
  /**
   * Self-expiring: a guest table session is a 2h JWT with NO refresh, but it
   * persisted in localStorage forever — every visit after those 2h attached a
   * dead token to every request, so the whole app answered with "Invalid or
   * expired guest session token". Check `exp` at the one point everyone reads
   * from; an expired token simply ceases to exist.
   */
  getGuest: () => {
    if (guestToken && secondsUntilExpiry(guestToken) <= 0) {
      guestToken = null;
      safeRemove(GUEST_KEY);
      notify();
    }
    return guestToken;
  },

  /** Subscribe to any token change. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  setSession(access: string, refresh: string) {
    accessToken = access;
    refreshToken = refresh;
    safeSet(REFRESH_KEY, refresh);
    notify();
  },
  setAccess(access: string) {
    accessToken = access;
    notify();
  },
  setGuest(token: string | null) {
    guestToken = token;
    if (token) safeSet(GUEST_KEY, token);
    else safeRemove(GUEST_KEY);
    notify();
  },
  clearSession() {
    accessToken = null;
    refreshToken = null;
    safeRemove(REFRESH_KEY);
    notify();
  },
  clearAll() {
    this.clearSession();
    guestToken = null;
    safeRemove(GUEST_KEY);
    notify();
  },
  hasSession: () => Boolean(refreshToken),
};

/**
 * MULTI-TAB SYNC. The in-memory `guestToken`/`refreshToken` are seeded from
 * localStorage ONCE at load; without this, a change in another tab (a new scan,
 * a refresh-token rotation, a logout) never reaches this tab, which keeps
 * sending the now-stale token and gets "Invalid or expired guest session
 * token" / a surprise logout. The `storage` event fires ONLY in other tabs, so
 * this simply mirrors their writes into this tab and notifies listeners (socket
 * re-auth, AuthProvider) — every open tab then shares one live session.
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.storageArea !== localStorage) return;
    if (e.key === GUEST_KEY) {
      guestToken = e.newValue;
      notify();
    } else if (e.key === REFRESH_KEY) {
      refreshToken = e.newValue;
      notify();
    }
  });
}

/** Decode a JWT payload without a library (unverified — for exp/claims only). */
export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as T;
  } catch {
    return null;
  }
}

/** Seconds until the token expires (or 0 if unknown/expired). */
export function secondsUntilExpiry(token: string | null): number {
  if (!token) return 0;
  const claims = decodeJwt<{ exp?: number }>(token);
  if (!claims?.exp) return 0;
  return Math.max(0, claims.exp - Math.floor(Date.now() / 1000));
}

function safeGet(k: string) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
function safeRemove(k: string) { try { localStorage.removeItem(k); } catch { /* ignore */ } }
