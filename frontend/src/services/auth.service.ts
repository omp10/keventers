import { BaseService } from './base.service';

export type AuthTokens = { accessToken: string; refreshToken: string };
export type AuthUser = {
  id: string;
  displayName?: string;
  email?: string;
  phone?: string;
  roles: string[];
  permissions: string[];
};
export type AuthSession = { user: AuthUser; tokens: AuthTokens };

/** Result of sending a login code. `devCode` is echoed outside production only. */
export type OtpChallenge = { phone: string; expiresInSeconds: number; resendInSeconds: number; devCode?: string };
/** A phone sign-in. `isNewUser` = the account was just created → route to onboarding. */
export type OtpSession = AuthSession & { isNewUser: boolean };

/**
 * AuthService — binds the identity endpoints. The Auth Platform consumes this;
 * pages/components never call it directly. All calls flow through the API
 * Platform (interceptors, retry, error mapping).
 */
class AuthServiceImpl extends BaseService {
  login(body: { email: string; password: string }) {
    return this.api.post<AuthSession>('/identity/auth/login', body, { skipAuth: true });
  }
  register(body: { email: string; password: string; firstName: string; lastName?: string; phone?: string }) {
    return this.api.post<AuthSession>('/identity/auth/register', body, { skipAuth: true });
  }
  /** Send a one-time login code to a phone (Kitchen + Staff apps). */
  requestOtp(phone: string) {
    return this.api.post<OtpChallenge>('/identity/auth/otp/request', { phone }, { skipAuth: true, retries: 0 });
  }
  /** Verify the code → session. Creates the account on first use. */
  verifyOtp(phone: string, code: string) {
    return this.api.post<OtpSession>('/identity/auth/otp/verify', { phone, code }, { skipAuth: true, retries: 0 });
  }
  async refresh(refreshToken: string) {
    const session = await this.api.post<{ tokens: AuthTokens }>(
      '/identity/auth/refresh',
      { refreshToken },
      { skipAuth: true, retries: 0 },
    );
    return session.tokens;
  }
  me() {
    return this.api.get<AuthUser>('/identity/auth/me');
  }
  logout() {
    return this.api.post<{ ok: true }>('/identity/auth/logout');
  }
  logoutAll() {
    return this.api.post<{ ok: true }>('/identity/auth/logout-all');
  }
  requestPasswordReset(email: string) {
    return this.api.post<void>('/identity/auth/password/forgot', { email }, { skipAuth: true });
  }
  confirmPasswordReset(body: { token: string; password: string }) {
    return this.api.post<void>('/identity/auth/password/reset', body, { skipAuth: true });
  }
}

export const authService = new AuthServiceImpl();
