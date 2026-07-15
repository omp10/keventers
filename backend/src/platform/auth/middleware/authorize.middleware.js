import { ForbiddenError, UnauthorizedError } from '#core/errors/app-error.js';

import { policyEvaluator } from '../rbac/policy.js';

/**
 * Authorization guard factories. Enforcement logic is complete; future modules
 * simply attach these to their protected routes.
 *
 *   router.post('/x', requireAuth, requirePermission('x:write'), handler)
 *   router.get('/y',  requireAuth, requireRole('admin'), handler)
 */

/** Require the principal to hold ALL of the given permissions. */
export function requirePermission(...permissions) {
  return function permissionGuard(req, _res, next) {
    if (!req.principal?.authenticated) return next(new UnauthorizedError());
    if (policyEvaluator.canAll(req.principal, permissions)) return next();
    return next(new ForbiddenError('Insufficient permissions'));
  };
}

/** Require the principal to hold ANY of the given permissions. */
export function requireAnyPermission(...permissions) {
  return function anyPermissionGuard(req, _res, next) {
    if (!req.principal?.authenticated) return next(new UnauthorizedError());
    if (policyEvaluator.canAny(req.principal, permissions)) return next();
    return next(new ForbiddenError('Insufficient permissions'));
  };
}

/** Require the principal to have one of the given roles. */
export function requireRole(...roles) {
  return function roleGuard(req, _res, next) {
    if (!req.principal?.authenticated) return next(new UnauthorizedError());
    if (policyEvaluator.hasRole(req.principal, roles)) return next();
    return next(new ForbiddenError('Insufficient role'));
  };
}

export default requirePermission;
