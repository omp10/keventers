import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { api } from '@/platform/api';
import { authService, type AuthUser } from '@/services';
import { AuthContext, type AuthStatus } from './auth-context';
import { secondsUntilExpiry, tokenStore } from './token-store';

/**
 * AUTH PLATFORM provider. The single owner of the authenticated session:
 *   • wires the API client's auth adapter (token + single-flight refresh),
 *   • recovers a session on load (refresh → fetch user),
 *   • silently refreshes the access token BEFORE it expires,
 *   • exposes roles + permissions to the permission platform.
 * Pages NEVER manage tokens/refresh themselves — they call `useAuth()`.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loggingOut = useRef(false);
  const inFlightRefresh = useRef<Promise<boolean> | null>(null);

  /**
   * Perform a token refresh (used by session recovery + the API adapter).
   *
   * SINGLE-FLIGHT: concurrent callers share one request. Without this, React
   * StrictMode's double-invoked mount effect spent two refreshes per page load,
   * and a burst of 401s could fire one per request — all racing to rotate the
   * same token and burning the endpoint's budget.
   */
  const performRefresh = useCallback(async (): Promise<boolean> => {
    const rt = tokenStore.getRefresh();
    if (!rt) return false;
    if (inFlightRefresh.current) return inFlightRefresh.current;

    inFlightRefresh.current = (async () => {
      try {
        const tokens = await authService.refresh(rt);
        tokenStore.setSession(tokens.accessToken, tokens.refreshToken);
        scheduleRefresh(tokens.accessToken);
        return true;
      } catch {
        return false;
      } finally {
        inFlightRefresh.current = null;
      }
    })();
    return inFlightRefresh.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearRefreshTimer = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = null;
  };

  /* Schedule a silent refresh 60s before the access token expires. */
  const scheduleRefresh = useCallback((accessToken: string) => {
    clearRefreshTimer();
    const seconds = secondsUntilExpiry(accessToken);
    const delay = Math.max(5, seconds - 60) * 1000;
    refreshTimer.current = setTimeout(() => { void performRefresh(); }, delay);
  }, [performRefresh]);

  const applySession = useCallback((u: AuthUser) => {
    setUser(u);
    setStatus('authenticated');
    const at = tokenStore.getAccess();
    if (at) scheduleRefresh(at);
  }, [scheduleRefresh]);

  const reloadUser = useCallback(async () => {
    const u = await authService.me();
    applySession(u);
  }, [applySession]);

  const logout = useCallback(async (opts?: { everywhere?: boolean }) => {
    // Re-entrancy guard: the logout request is itself authenticated, so when the
    // token is already dead it 401s — which drives the API adapter's
    // onUnauthorized straight back into logout(). Without this, that recursion
    // never terminates and floods the server.
    if (loggingOut.current) return;
    loggingOut.current = true;
    try {
      await (opts?.everywhere ? authService.logoutAll() : authService.logout());
    } catch {
      /* best-effort — the local session is cleared either way */
    } finally {
      clearRefreshTimer();
      tokenStore.clearSession();
      setUser(null);
      setStatus(tokenStore.getGuest() ? 'guest' : 'unauthenticated');
      loggingOut.current = false;
    }
  }, []);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    const session = await authService.login(credentials);
    tokenStore.setSession(session.tokens.accessToken, session.tokens.refreshToken);
    applySession(session.user);
  }, [applySession]);

  /**
   * Passwordless phone sign-in. Returns `isNewUser` so the caller can route a
   * first-timer into onboarding; the session itself is already live either way.
   */
  const loginWithOtp = useCallback(async (phone: string, code: string): Promise<{ isNewUser: boolean }> => {
    const session = await authService.verifyOtp(phone, code);
    tokenStore.setSession(session.tokens.accessToken, session.tokens.refreshToken);
    applySession(session.user);
    return { isNewUser: session.isNewUser };
  }, [applySession]);

  const register = useCallback(async (body: Parameters<typeof authService.register>[0]) => {
    const session = await authService.register(body);
    tokenStore.setSession(session.tokens.accessToken, session.tokens.refreshToken);
    applySession(session.user);
  }, [applySession]);

  const setGuestToken = useCallback((token: string | null) => {
    tokenStore.setGuest(token);
    setStatus((s) => (s === 'authenticated' ? s : token ? 'guest' : 'unauthenticated'));
  }, []);

  /**
   * The guest table session died (expired, or the staff closed the table).
   *
   * Drop the token FIRST — leaving it in storage is what made "Invalid or
   * expired guest session token" follow the customer around forever — then send
   * them to the entry screen, which is the only place a new session can be
   * started (by scanning the table QR again). Signing in would NOT fix this:
   * the cart is scoped to the table session, not the account, so /login would
   * hand them an account and still no session.
   *
   * A hard navigation rather than useNavigate: this provider is also mounted
   * with `withRouter={false}`, where router hooks would throw — and a dead
   * session means every cached cart/order query is garbage anyway, so a clean
   * reload is the honest reset.
   */
  const expireGuest = useCallback(() => {
    if (!tokenStore.getGuest()) return; // already handled by a concurrent 401
    tokenStore.setGuest(null);
    setStatus(tokenStore.hasSession() ? 'authenticated' : 'unauthenticated');
    if (window.location.pathname !== '/') window.location.assign('/');
  }, []);

  /* Wire the API client adapter ONCE (decoupled — API never imports auth). */
  useEffect(() => {
    api.setAuthAdapter({
      getAccessToken: () => tokenStore.getAccess(),
      getGuestToken: () => tokenStore.getGuest(),
      refresh: performRefresh,
      onUnauthorized: () => { void logout(); },
      onGuestExpired: expireGuest,
    });
  }, [performRefresh, logout, expireGuest]);

  /* Session recovery on mount. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (tokenStore.hasSession() && (await performRefresh())) {
        try {
          const u = await authService.me();
          if (!cancelled) applySession(u);
          return;
        } catch { /* fall through */ }
      }
      if (!cancelled) setStatus(tokenStore.getGuest() ? 'guest' : 'unauthenticated');
    })();
    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Set your own name. The response IS the updated user, so it becomes the new
   * session state directly — no re-fetch, and no window where the UI still shows
   * the old name.
   */
  const updateName = useCallback(async (name: { firstName: string; lastName?: string; dateOfBirth?: string }) => {
    const updated = await authService.updateMe(name);
    setUser(updated);
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      roles: user?.roles ?? [],
      permissions: user?.permissions ?? [],
      isAuthenticated: status === 'authenticated',
      isGuest: status === 'guest',
      login,
      loginWithOtp,
      register,
      logout,
      setGuestToken,
      refresh: performRefresh,
      reloadUser,
      updateName,
    }),
    [status, user, login, loginWithOtp, register, logout, setGuestToken, performRefresh, reloadUser, updateName],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
