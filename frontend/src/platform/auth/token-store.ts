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

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh: () => refreshToken,
  getGuest: () => guestToken,

  setSession(access: string, refresh: string) {
    accessToken = access;
    refreshToken = refresh;
    safeSet(REFRESH_KEY, refresh);
  },
  setAccess(access: string) {
    accessToken = access;
  },
  setGuest(token: string | null) {
    guestToken = token;
    if (token) safeSet(GUEST_KEY, token);
    else safeRemove(GUEST_KEY);
  },
  clearSession() {
    accessToken = null;
    refreshToken = null;
    safeRemove(REFRESH_KEY);
  },
  clearAll() {
    this.clearSession();
    guestToken = null;
    safeRemove(GUEST_KEY);
  },
  hasSession: () => Boolean(refreshToken),
};

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
