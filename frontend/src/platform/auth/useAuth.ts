import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from './auth-context';

/** Access the auth session + actions. Must be under <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>.');
  return ctx;
}

/** Convenience selectors. */
export function useIsAuthenticated(): boolean {
  return useAuth().isAuthenticated;
}
export function useCurrentUser() {
  return useAuth().user;
}
