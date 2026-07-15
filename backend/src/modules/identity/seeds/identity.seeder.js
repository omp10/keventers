import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { config } from '#config';
import { eventBus } from '#core/eventbus/index.js';
import { ValidationError } from '#core/errors/app-error.js';
import { logger as baseLogger } from '#core/logging/logger.js';
import { AuditLog } from '#core/observability/audit-log.js';
import { passwordService, permissionRegistry, roleRegistry } from '#platform/auth/index.js';

import { USER_STATUS, USER_TYPE } from '../constants/identity.constants.js';
import {
  PermissionCreatedEvent,
  RoleCreatedEvent,
  UserCreatedEvent,
} from '../events/identity.events.js';
import { permissionRepository } from '../repositories/permission.repository.js';
import { roleRepository } from '../repositories/role.repository.js';
import { userRepository } from '../repositories/user.repository.js';

import {
  buildPermissionCatalog,
  ROLE_DEFINITIONS,
  SUPER_ADMIN_ROLE,
} from './permission-catalog.js';

const docId = (doc) => (doc?.id ?? (doc?._id ? String(doc._id) : null));

function splitName(fullName) {
  const parts = String(fullName ?? '').trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() || 'Platform';
  return { firstName, lastName: parts.join(' ') };
}

/**
 * Bootstraps a fresh installation's identity data: the permission catalog,
 * production roles, and the initial Platform Super Admin. Fully idempotent —
 * every record is created only if missing, so repeated runs never duplicate
 * data, and events/audit fire only on first creation.
 *
 * Reuses existing abstractions only: repositories (data), PasswordService
 * (hashing), the RBAC registries, the event bus, and the audit logger. No
 * direct MongoDB/driver access.
 */
export class IdentitySeeder extends BaseSeeder {
  constructor({
    permissions = permissionRepository,
    roles = roleRepository,
    users = userRepository,
    passwords = passwordService,
    events = eventBus,
    audit = AuditLog,
    seedConfig = config.seed,
    rbac = { roleRegistry, permissionRegistry },
    logger,
  } = {}) {
    super();
    // Versioned name → the SeedRunner ledger runs this exactly once per install.
    this.name = '001-identity-core';
    this.permissions = permissions;
    this.roles = roles;
    this.users = users;
    this.passwords = passwords;
    this.events = events;
    this.audit = audit;
    this.seedConfig = seedConfig;
    this.rbac = rbac;
    this.logger = logger ?? baseLogger({ module: 'identity', component: 'seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = {
      permissions: { created: 0, skipped: 0 },
      roles: { created: 0, skipped: 0 },
      admin: { created: false, skipped: false },
      organization: { status: 'skipped' },
    };

    await this.#seedPermissions(summary);
    await this.#seedRoles(summary);
    await this.#seedSuperAdmin(summary);
    await this.#seedDefaultOrganization(summary);

    this.logger.info({ summary }, 'Identity seed complete');
    return summary;
  }

  async #seedPermissions(summary) {
    for (const perm of buildPermissionCatalog()) {
      // Keep the runtime RBAC registry in sync regardless of DB state.
      this.rbac.permissionRegistry.register(perm.name);

      if (await this.permissions.findByName(perm.name)) {
        summary.permissions.skipped += 1;
        continue;
      }
      const created = await this.permissions.create({ ...perm });
      await this.events.publish(
        new PermissionCreatedEvent({ permissionId: docId(created), name: perm.name }),
      );
      this.audit.record({
        action: 'identity.permission.created',
        targetId: docId(created),
        outcome: 'success',
        metadata: { name: perm.name, seeded: true },
      });
      summary.permissions.created += 1;
    }
  }

  async #seedRoles(summary) {
    for (const def of ROLE_DEFINITIONS) {
      // Register the role (with wildcard grants) in the RBAC registry.
      this.rbac.roleRegistry.define(def.name, def.permissions);

      if (await this.roles.findByName(def.name)) {
        summary.roles.skipped += 1;
        continue;
      }
      const created = await this.roles.create({
        name: def.name,
        displayName: def.displayName,
        description: def.description,
        permissions: def.permissions,
        isSystem: def.isSystem ?? true,
        priority: def.priority ?? 0,
      });
      await this.events.publish(new RoleCreatedEvent({ roleId: docId(created), name: def.name }));
      this.audit.record({
        action: 'identity.role.created',
        targetId: docId(created),
        outcome: 'success',
        metadata: { name: def.name, permissions: def.permissions.length, seeded: true },
      });
      summary.roles.created += 1;
    }
  }

  async #seedSuperAdmin(summary) {
    const admin = this.seedConfig.admin;
    this.#assertAdminConfig(admin);

    const email = admin.email.toLowerCase();
    if (await this.users.findByEmail(email)) {
      summary.admin.skipped = true;
      this.logger.info({ email }, 'Platform Super Admin already exists — skipping');
      return;
    }

    const { firstName, lastName } = splitName(admin.name);
    const passwordHash = await this.passwords.hash(admin.password);

    const user = await this.users.create({
      email,
      phone: admin.phone ?? null,
      passwordHash, // never store plain text
      firstName,
      lastName,
      type: USER_TYPE.STAFF,
      status: USER_STATUS.ACTIVE, // active
      emailVerified: true, // verified
      roles: [SUPER_ADMIN_ROLE], // Platform Super Admin role
      permissions: [],
      passwordChangedAt: new Date(),
    });

    await this.events.publish(
      new UserCreatedEvent({ userId: docId(user), email, type: USER_TYPE.STAFF, bootstrap: true }),
    );
    this.audit.record({
      action: 'identity.user.super_admin_created',
      targetId: docId(user),
      outcome: 'success',
      metadata: { email, seeded: true },
    });
    summary.admin.created = true;
    this.logger.info({ email }, 'Platform Super Admin created');
  }

  #assertAdminConfig(admin) {
    const missing = [];
    if (!admin?.name) missing.push('PLATFORM_ADMIN_NAME');
    if (!admin?.email) missing.push('PLATFORM_ADMIN_EMAIL');
    if (!admin?.password) missing.push('PLATFORM_ADMIN_PASSWORD');
    if (missing.length > 0) {
      throw new ValidationError(
        'Cannot seed Platform Super Admin — missing required configuration',
        missing.map((key) => ({ path: key, message: `${key} is required` })),
      );
    }
  }

  async #seedDefaultOrganization(summary) {
    if (!this.seedConfig.organization?.enabled) {
      summary.organization = { status: 'disabled' };
      return;
    }
    // The Organization module is not implemented yet, and the User model has no
    // organization link. Seeding is deferred rather than inventing schema here.
    summary.organization = { status: 'deferred', name: this.seedConfig.organization.name };
    this.logger.warn(
      { organization: this.seedConfig.organization.name },
      'Default organization seeding is enabled but the Organization module is not implemented yet — deferring. The Super Admin will be linked once that module lands.',
    );
  }

  /**
   * Best-effort teardown of the records this seeder creates (used by
   * `seed --rollback`). Only removes the known system records; never touches
   * data created by operators afterwards.
   */
  async rollback(context = {}) {
    if (context.logger) this.logger = context.logger;

    const admin = this.seedConfig.admin;
    if (admin?.email) {
      const user = await this.users.findByEmail(admin.email.toLowerCase());
      if (user) await this.users.deleteById(docId(user));
    }
    for (const def of ROLE_DEFINITIONS) {
      const role = await this.roles.findByName(def.name);
      if (role) await this.roles.deleteById(docId(role));
    }
    for (const perm of buildPermissionCatalog()) {
      const found = await this.permissions.findByName(perm.name);
      if (found) await this.permissions.deleteById(docId(found));
    }
    this.logger.info('Identity seed rolled back');
  }
}

export const identitySeeder = new IdentitySeeder();
export default identitySeeder;
