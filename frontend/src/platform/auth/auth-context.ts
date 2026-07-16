import { createContext } from 'react';

import type { AuthUser } from '@/services';

export type AuthStatus = 'loading' | 'authenticated' | 'guest' | 'unauthenticated';

export type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  roles: string[];
  permissions: string[];
  isAuthenticated: boolean;
  isGuest: boolean;

  login: (credentials: { email: string; password: string }) => Promise<void>;
  /** Passwordless phone sign-in; resolves `isNewUser` for onboarding routing. */
  loginWithOtp: (phone: string, code: string) => Promise<{ isNewUser: boolean }>;
  register: (body: { email: string; password: string; firstName: string; lastName?: string; phone?: string }) => Promise<void>;
  logout: (opts?: { everywhere?: boolean }) => Promise<void>;
  /** Adopt a guest token (from a QR scan) — enables the guest ordering flow. */
  setGuestToken: (token: string | null) => void;
  /** Force a silent refresh (e.g. after a permission change). */
  refresh: () => Promise<boolean>;
  /** Re-fetch the current user (roles/permissions). */
  reloadUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
