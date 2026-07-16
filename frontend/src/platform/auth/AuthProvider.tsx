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

  /* Perform a token refresh (used by session recovery + the API adapter). */
  const performRefresh = useCallback(async (): Promise<boolean> => {
    const rt = tokenStore.getRefresh();
    if (!rt) return false;
    try {
      const tokens = await authService.refresh(rt);
      tokenStore.setSession(tokens.accessToken, tokens.refreshToken);
      scheduleRefresh(tokens.accessToken);
      return true;
    } catch {
      return false;
    }
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

  /* Wire the API client adapter ONCE (decoupled — API never imports auth). */
  useEffect(() => {
    api.setAuthAdapter({
      getAccessToken: () => tokenStore.getAccess(),
      getGuestToken: () => tokenStore.getGuest(),
      refresh: performRefresh,
      onUnauthorized: () => { void logout(); },
    });
  }, [performRefresh, logout]);

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
    }),
    [status, user, login, loginWithOtp, register, logout, setGuestToken, performRefresh, reloadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
