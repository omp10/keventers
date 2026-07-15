/**
 * Identity module — PUBLIC BARREL. Other modules import ONLY from here: the
 * module's service interfaces, domain events, and constants. Controllers,
 * repositories, models and validators are private to the module.
 */
export { identityModule } from './identity.module.js';

// Service singletons (behavior other modules may compose via DI tokens).
export { userService } from './services/user.service.js';
export { authService } from './services/auth.service.js';
export { roleService } from './services/role.service.js';
export { permissionService } from './services/permission.service.js';
export { staffService } from './services/staff.service.js';

// DI tokens for container-based resolution.
export { IDENTITY_TOKENS } from './constants/identity.tokens.js';

// Bootstrap seeder (registered with the platform seed runner).
export { identitySeeder, IdentitySeeder } from './seeds/index.js';

// Domain events + names other modules can subscribe to.
export * from './events/identity.events.js';

// Public constants.
export {
  IDENTITY_PERMISSIONS,
  DEFAULT_ROLE,
  USER_STATUS,
  USER_TYPE,
  STAFF_STATUS,
} from './constants/identity.constants.js';
