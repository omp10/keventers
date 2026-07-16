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
  refresh(refreshToken: string) {
    return this.api.post<AuthTokens>('/identity/auth/refresh', { refreshToken }, { skipAuth: true, retries: 0 });
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
