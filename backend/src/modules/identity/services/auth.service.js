import { BaseService } from '#core/service/base.service.js';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '#core/errors/app-error.js';
import { passwordService, sessionService } from '#platform/auth/index.js';

import { ACCOUNT_LOCK, IDENTITY_ERRORS, USER_STATUS, USER_TYPE } from '../constants/identity.constants.js';
import { toAuthDTO, toUserDTO } from '../dto/identity.dto.js';
import { SessionRevokedEvent } from '../events/identity.events.js';
import { roleRepository } from '../repositories/role.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { buildSessionIdentity, resolveEffectivePermissions } from '../utils/identity.utils.js';

import { userService } from './user.service.js';

/**
 * Authentication orchestration for the identity module. Integrates the platform
 * auth services (password hashing, sessions, JWT) — it does NOT reimplement any
 * of them.
 */
export class AuthService extends BaseService {
  constructor({
    users = userRepository,
    roles = roleRepository,
    passwords = passwordService,
    sessions = sessionService,
    userSvc = userService,
    eventBus,
  } = {}) {
    super({ name: 'identity.auth', eventBus });
    this.users = users;
    this.roles = roles;
    this.passwords = passwords;
    this.sessions = sessions;
    this.userService = userSvc;
  }

  /** Issue a session + token pair for an authenticated user record. */
  async #issueSession(user, meta = {}) {
    const effective = await resolveEffectivePermissions(this.roles, user.roles ?? [], user.permissions ?? []);
    const identity = buildSessionIdentity(user, effective);
    const session = await this.sessions.createSession({ ...identity, meta: { ...identity.meta, ...meta } });
    return {
      sessionId: session.sessionId,
      tokens: { accessToken: session.accessToken, refreshToken: session.refreshToken },
    };
  }

  /** Public self-registration → creates a customer user and logs them in. */
  async register(data, meta = {}) {
    const created = await this.userService.createUser({ ...data, type: USER_TYPE.CUSTOMER, roles: [] });
    const user = await this.users.findById(created.id);
    const { sessionId, tokens } = await this.#issueSession(user, meta);
    this.audit.success('identity.auth.registered', { targetId: user.id });
    return toAuthDTO({ user, tokens, sessionId });
  }

  async login(email, password, meta = {}) {
    const user = await this.users.findByEmailForAuth(email);
    if (!user) throw new UnauthorizedError(IDENTITY_ERRORS.INVALID_CREDENTIALS);

    const userId = String(user.id ?? user._id);

    if (user.status === USER_STATUS.DISABLED) {
      throw new ForbiddenError(IDENTITY_ERRORS.ACCOUNT_DISABLED);
    }
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new ForbiddenError(IDENTITY_ERRORS.ACCOUNT_LOCKED);
    }

    const matches = await this.passwords.compare(password, user.passwordHash);
    if (!matches) {
      await this.#registerFailedAttempt(userId, user.failedLoginAttempts ?? 0);
      throw new UnauthorizedError(IDENTITY_ERRORS.INVALID_CREDENTIALS);
    }

    // Success → reset counters, stamp login.
    await this.users.updateById(userId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });

    const { sessionId, tokens } = await this.#issueSession(user, meta);
    this.audit.success('identity.auth.login', { actorId: userId, targetId: userId });
    const fresh = await this.users.findById(userId);
    return toAuthDTO({ user: fresh, tokens, sessionId });
  }

  async #registerFailedAttempt(userId, current) {
    const attempts = current + 1;
    const patch = { failedLoginAttempts: attempts };
    if (attempts >= ACCOUNT_LOCK.MAX_FAILED_ATTEMPTS) {
      patch.failedLoginAttempts = 0;
      patch.lockedUntil = new Date(Date.now() + ACCOUNT_LOCK.LOCK_MINUTES * 60_000);
      patch.status = USER_STATUS.LOCKED;
    }
    await this.users.updateById(userId, patch);
  }

  /** Rotate tokens using the platform session service (validates + reissues). */
  async refresh(refreshToken) {
    const rotated = await this.sessions.refresh(refreshToken);
    return {
      tokens: {
        accessToken: rotated.accessToken,
        refreshToken: rotated.refreshToken,
        tokenType: 'Bearer',
      },
      session: { id: rotated.sessionId },
    };
  }

  /** Revoke the current session (logout this device). */
  async logout(userId, sessionId) {
    if (sessionId) await this.sessions.revoke(sessionId, userId);
    await this.events.publish(new SessionRevokedEvent({ userId, scope: 'session', sessionId }));
    this.audit.success('identity.auth.logout', { actorId: userId, targetId: userId });
    return { loggedOut: true };
  }

  /** Revoke every session for the user (logout everywhere). */
  async logoutAll(userId) {
    await this.sessions.revokeAll(userId);
    await this.events.publish(new SessionRevokedEvent({ userId, scope: 'all' }));
    this.audit.success('identity.auth.logout_all', { actorId: userId, targetId: userId });
    return { loggedOut: true };
  }

  async me(userId) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError(IDENTITY_ERRORS.USER_NOT_FOUND);
    return toUserDTO(user);
  }
}

export const authService = new AuthService();
export default authService;
