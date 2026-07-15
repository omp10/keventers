/**
 * Authentication platform — public barrel. Future modules import auth
 * primitives from here only.
 */
export * from './constants/auth.constants.js';

export { passwordService, PasswordService } from './password.service.js';

export { AccessToken } from './jwt/access-token.js';
export { RefreshToken } from './jwt/refresh-token.js';
export { tokenGenerationService, TokenGenerationService } from './jwt/token-generation.service.js';
export {
  tokenVerificationService,
  TokenVerificationService,
} from './jwt/token-verification.service.js';

export { permissionRegistry, PermissionRegistry } from './rbac/permissions.js';
export { roleRegistry, RoleRegistry } from './rbac/roles.js';
export { policyEvaluator, PolicyEvaluator } from './rbac/policy.js';

export { sessionService, SessionService } from './session.service.js';

export { authenticate, requireAuth } from './middleware/authenticate.middleware.js';
export {
  requirePermission,
  requireAnyPermission,
  requireRole,
} from './middleware/authorize.middleware.js';
