import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { permissionRegistry, roleRegistry } from '#platform/auth/index.js';

import { DEFAULT_ROLE, IDENTITY_PERMISSIONS } from './constants/identity.constants.js';
import { IDENTITY_TOKENS } from './constants/identity.tokens.js';
import { registerIdentityEventHandlers } from './events/handlers.js';
import { permissionRepository } from './repositories/permission.repository.js';
import { roleRepository } from './repositories/role.repository.js';
import { staffRepository } from './repositories/staff.repository.js';
import { userRepository } from './repositories/user.repository.js';
import identityRouter from './routes/index.js';
import { authService } from './services/auth.service.js';
import { permissionService } from './services/permission.service.js';
import { roleService } from './services/role.service.js';
import { staffService } from './services/staff.service.js';
import { userService } from './services/user.service.js';

/**
 * Identity module composition. Registers providers in the shared DI container,
 * seeds the RBAC registry with identity permissions/default roles (in-memory,
 * for consistent authorization), and wires event handlers. Exposes the module
 * router for the API aggregator.
 *
 * This is the ONLY integration seam with the platform — the module never
 * mutates platform internals directly beyond the documented registries.
 */
export const identityModule = {
  name: 'identity',
  basePath: '/identity',
  router: identityRouter,

  registerDependencies(container = sharedContainer) {
    container.register(IDENTITY_TOKENS.UserRepository, userRepository);
    container.register(IDENTITY_TOKENS.RoleRepository, roleRepository);
    container.register(IDENTITY_TOKENS.PermissionRepository, permissionRepository);
    container.register(IDENTITY_TOKENS.StaffRepository, staffRepository);

    container.register(IDENTITY_TOKENS.UserService, userService);
    container.register(IDENTITY_TOKENS.AuthService, authService);
    container.register(IDENTITY_TOKENS.RoleService, roleService);
    container.register(IDENTITY_TOKENS.PermissionService, permissionService);
    container.register(IDENTITY_TOKENS.StaffService, staffService);
  },

  /** Seed identity permissions + default roles into the RBAC registry. */
  bootstrapRbac() {
    const perms = Object.values(IDENTITY_PERMISSIONS);
    permissionRegistry.registerMany(perms);

    // admin: full identity administration. staff/customer: minimal defaults.
    roleRegistry.define(DEFAULT_ROLE.ADMIN, perms);
    roleRegistry.grant(DEFAULT_ROLE.STAFF, [
      IDENTITY_PERMISSIONS.USER_READ,
      IDENTITY_PERMISSIONS.STAFF_READ,
    ]);
    roleRegistry.define(DEFAULT_ROLE.CUSTOMER, []);
  },

  registerEventHandlers(eventBus = sharedEventBus) {
    registerIdentityEventHandlers(eventBus);
  },

  /** One-call boot used by the composition root. */
  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.bootstrapRbac();
    this.registerEventHandlers(eventBus);
    logger().info({ module: this.name }, 'Identity module registered');
    return this;
  },
};

export default identityModule;
