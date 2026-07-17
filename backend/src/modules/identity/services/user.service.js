import { BaseService } from '#core/service/base.service.js';
import { ConflictError, NotFoundError, ValidationError } from '#core/errors/app-error.js';
import { SecureToken } from '#core/security/secure-token.js';
import { HashHelper } from '#core/security/hash.helper.js';
import { passwordService, sessionService } from '#platform/auth/index.js';

import {
  IDENTITY_CACHE,
  IDENTITY_ERRORS,
  USER_STATUS,
  USER_TYPE,
} from '../constants/identity.constants.js';
import { toUserDTO } from '../dto/identity.dto.js';
import {
  PasswordChangedEvent,
  PasswordResetRequestedEvent,
  PermissionAssignedEvent,
  PermissionRemovedEvent,
  ProfileUpdatedEvent,
  RoleAssignedEvent,
  RoleRemovedEvent,
  SessionRevokedEvent,
  UserCreatedEvent,
  UserDeletedEvent,
  UserDisabledEvent,
  UserEnabledEvent,
  UserUpdatedEvent,
} from '../events/identity.events.js';
import { permissionRepository } from '../repositories/permission.repository.js';
import { roleRepository } from '../repositories/role.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { normalizeNames } from '../utils/identity.utils.js';

/**
 * User business logic. All identity user rules live here; controllers only
 * validate and delegate; repositories only persist.
 */
export class UserService extends BaseService {
  constructor({
    users = userRepository,
    roles = roleRepository,
    permissions = permissionRepository,
    passwords = passwordService,
    sessions = sessionService,
    eventBus,
  } = {}) {
    super({ name: 'identity.user', eventBus });
    this.users = users;
    this.roles = roles;
    this.permissions = permissions;
    this.passwords = passwords;
    this.sessions = sessions;
  }

  // --- internal guards ---

  async #getOrThrow(id) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError(IDENTITY_ERRORS.USER_NOT_FOUND);
    return user;
  }

  async #assertRolesExist(names = []) {
    if (names.length === 0) return;
    const found = await this.roles.findByNames(names);
    if (found.length !== new Set(names).size) {
      throw new ValidationError(IDENTITY_ERRORS.ROLE_NOT_FOUND);
    }
  }

  async #assertPermissionsExist(names = []) {
    if (names.length === 0) return;
    const found = await this.permissions.findByNames(names);
    if (found.length !== new Set(names).size) {
      throw new ValidationError(IDENTITY_ERRORS.PERMISSION_NOT_FOUND);
    }
  }

  async #revokeSessions(userId, reason) {
    await this.sessions.revokeAll(userId);
    await this.events.publish(new SessionRevokedEvent({ userId, scope: 'all', reason }));
  }

  // --- commands ---

  async createUser(data, actorId = null) {
    if (await this.users.existsByEmail(data.email)) {
      throw new ConflictError(IDENTITY_ERRORS.EMAIL_TAKEN);
    }
    if (data.phone && (await this.users.existsByPhone(data.phone))) {
      throw new ConflictError(IDENTITY_ERRORS.PHONE_TAKEN);
    }
    const roles = normalizeNames(data.roles ?? []);
    const permissions = normalizeNames(data.permissions ?? []);
    await this.#assertRolesExist(roles);
    await this.#assertPermissionsExist(permissions);

    const passwordHash = await this.passwords.hash(data.password);
    const user = await this.users.create({
      email: data.email,
      phone: data.phone ?? null,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName ?? '',
      type: data.type ?? USER_TYPE.CUSTOMER,
      roles,
      permissions,
      passwordChangedAt: new Date(),
      createdBy: actorId,
    });

    await this.events.publish(new UserCreatedEvent({ userId: user.id, email: user.email, type: user.type }));
    this.audit.success('identity.user.created', { actorId, targetId: user.id, metadata: { email: user.email } });
    return toUserDTO(user);
  }

  async getUser(id) {
    return toUserDTO(await this.#getOrThrow(id));
  }

  /** Look up a user by email (read-only). Returns a DTO or null. */
  async getUserByEmail(email) {
    const user = await this.users.findByEmail(email);
    return user ? toUserDTO(user) : null;
  }

  /** Look up a user by phone (read-only). Returns a DTO or null. */
  async getUserByPhone(phone) {
    const user = await this.users.findByPhone(phone);
    return user ? toUserDTO(user) : null;
  }

  async listUsers(query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.role) filter.roles = query.role;

    const page = await this.users.paginate({
      filter,
      search: query.search,
      sort: query.sort,
      pagination: { page: query.page, limit: query.limit },
      allowedFilterFields: ['status', 'type', 'roles'],
    });
    return this.paginated(page, toUserDTO);
  }

  async updateUser(id, data, actorId = null) {
    await this.#getOrThrow(id);
    if (data.email && (await this.users.findByEmail(data.email))) {
      throw new ConflictError(IDENTITY_ERRORS.EMAIL_TAKEN);
    }
    if (data.phone && (await this.users.existsByPhone(data.phone))) {
      throw new ConflictError(IDENTITY_ERRORS.PHONE_TAKEN);
    }
    const updated = await this.users.updateById(id, { ...data, updatedBy: actorId });
    await this.events.publish(new UserUpdatedEvent({ userId: id, changes: Object.keys(data) }));
    this.audit.success('identity.user.updated', { actorId, targetId: id, metadata: { changes: Object.keys(data) } });
    return toUserDTO(updated);
  }

  async updateProfile(id, profile, actorId = null) {
    const user = await this.#getOrThrow(id);
    const merged = { ...(user.profile ?? {}), ...profile };
    const updated = await this.users.updateById(id, { profile: merged });
    await this.events.publish(new ProfileUpdatedEvent({ userId: id, fields: Object.keys(profile) }));
    this.audit.success('identity.user.profile_updated', { actorId, targetId: id });
    return toUserDTO(updated);
  }

  async disableUser(id, actorId = null) {
    await this.#getOrThrow(id);
    const updated = await this.users.updateById(id, { status: USER_STATUS.DISABLED, updatedBy: actorId });
    await this.#revokeSessions(id, 'user_disabled');
    await this.events.publish(new UserDisabledEvent({ userId: id }));
    this.audit.success('identity.user.disabled', { actorId, targetId: id });
    return toUserDTO(updated);
  }

  async enableUser(id, actorId = null) {
    await this.#getOrThrow(id);
    const updated = await this.users.updateById(id, {
      status: USER_STATUS.ACTIVE,
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedBy: actorId,
    });
    await this.events.publish(new UserEnabledEvent({ userId: id }));
    this.audit.success('identity.user.enabled', { actorId, targetId: id });
    return toUserDTO(updated);
  }

  async deleteUser(id, actorId = null) {
    await this.#getOrThrow(id);
    await this.users.softDeleteById(id);
    await this.#revokeSessions(id, 'user_deleted');
    await this.events.publish(new UserDeletedEvent({ userId: id }));
    this.audit.success('identity.user.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }

  // --- roles & permissions ---

  async assignRoles(id, roleNames, actorId = null) {
    const user = await this.#getOrThrow(id);
    const names = normalizeNames(roleNames);
    await this.#assertRolesExist(names);
    const merged = normalizeNames([...(user.roles ?? []), ...names]);
    const updated = await this.users.updateById(id, { roles: merged, updatedBy: actorId });
    await this.#revokeSessions(id, 'roles_changed');
    await this.events.publish(new RoleAssignedEvent({ userId: id, roles: names }));
    this.audit.success('identity.user.role_assigned', { actorId, targetId: id, metadata: { roles: names } });
    return toUserDTO(updated);
  }

  async removeRoles(id, roleNames, actorId = null) {
    const user = await this.#getOrThrow(id);
    const names = normalizeNames(roleNames);
    const remaining = (user.roles ?? []).filter((r) => !names.includes(r));
    const updated = await this.users.updateById(id, { roles: remaining, updatedBy: actorId });
    await this.#revokeSessions(id, 'roles_changed');
    await this.events.publish(new RoleRemovedEvent({ userId: id, roles: names }));
    this.audit.success('identity.user.role_removed', { actorId, targetId: id, metadata: { roles: names } });
    return toUserDTO(updated);
  }

  async assignPermissions(id, permissionNames, actorId = null) {
    const user = await this.#getOrThrow(id);
    const names = normalizeNames(permissionNames);
    await this.#assertPermissionsExist(names);
    const merged = normalizeNames([...(user.permissions ?? []), ...names]);
    const updated = await this.users.updateById(id, { permissions: merged, updatedBy: actorId });
    await this.#revokeSessions(id, 'permissions_changed');
    await this.events.publish(new PermissionAssignedEvent({ userId: id, permissions: names }));
    this.audit.success('identity.user.permission_assigned', {
      actorId,
      targetId: id,
      metadata: { permissions: names },
    });
    return toUserDTO(updated);
  }

  async removePermissions(id, permissionNames, actorId = null) {
    const user = await this.#getOrThrow(id);
    const names = normalizeNames(permissionNames);
    const remaining = (user.permissions ?? []).filter((p) => !names.includes(p));
    const updated = await this.users.updateById(id, { permissions: remaining, updatedBy: actorId });
    await this.#revokeSessions(id, 'permissions_changed');
    await this.events.publish(new PermissionRemovedEvent({ userId: id, permissions: names }));
    this.audit.success('identity.user.permission_removed', {
      actorId,
      targetId: id,
      metadata: { permissions: names },
    });
    return toUserDTO(updated);
  }

  // --- password management ---

  async changePassword(id, currentPassword, newPassword) {
    // Need the hidden hash → go through the auth-select repo method.
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError(IDENTITY_ERRORS.USER_NOT_FOUND);
    const withSecret = await this.users.findByEmailForAuth(user.email);
    const matches = await this.passwords.compare(currentPassword, withSecret.passwordHash);
    if (!matches) throw new ValidationError(IDENTITY_ERRORS.CURRENT_PASSWORD_INVALID);

    const passwordHash = await this.passwords.hash(newPassword);
    await this.users.updateById(id, { passwordHash, passwordChangedAt: new Date() });
    await this.#revokeSessions(id, 'password_changed');
    await this.events.publish(new PasswordChangedEvent({ userId: id, self: true }));
    this.audit.success('identity.user.password_changed', { actorId: id, targetId: id });
    return { id, passwordChanged: true };
  }

  /**
   * Begin a password reset. Always resolves the same way (no user enumeration).
   * A raw token is generated; only its hash is stored (keyed) in the cache, and
   * the raw token is emitted on an event for a future notification module.
   */
  async requestPasswordReset(email) {
    const user = await this.users.findByEmail(email);
    if (user) {
      const token = SecureToken.urlSafe(32);
      const tokenHash = HashHelper.sha256(token);
      await this.cache.set(
        `${IDENTITY_CACHE.PASSWORD_RESET_PREFIX}:${tokenHash}`,
        user.id,
        IDENTITY_CACHE.PASSWORD_RESET_TTL_SECONDS,
      );
      await this.events.publish(new PasswordResetRequestedEvent({ userId: user.id, email, token }));
      this.audit.success('identity.user.password_reset_requested', { targetId: user.id });
    }
    return { requested: true };
  }

  async confirmPasswordReset(token, newPassword) {
    const tokenHash = HashHelper.sha256(token);
    const cacheKey = `${IDENTITY_CACHE.PASSWORD_RESET_PREFIX}:${tokenHash}`;
    const userId = await this.cache.get(cacheKey);
    if (!userId) throw new ValidationError('Invalid or expired reset token');

    const passwordHash = await this.passwords.hash(newPassword);
    await this.users.updateById(userId, { passwordHash, passwordChangedAt: new Date() });
    await this.cache.del(cacheKey);
    await this.#revokeSessions(userId, 'password_reset');
    await this.events.publish(new PasswordChangedEvent({ userId, self: false }));
    this.audit.success('identity.user.password_reset', { targetId: userId });
    return { passwordChanged: true };
  }
}

export const userService = new UserService();
export default userService;
