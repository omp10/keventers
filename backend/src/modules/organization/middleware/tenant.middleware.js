import { ForbiddenError } from '#core/errors/app-error.js';

import { ORG_ERRORS } from '../constants/organization.constants.js';
import { tenantService } from '../services/tenant.service.js';

/**
 * Resolves the tenant context from the authenticated principal's memberships
 * and attaches it as `req.tenant`. Apply AFTER `requireAuth`. Every tenant-aware
 * service reads `req.tenant` to guarantee no cross-organization access.
 */
export async function resolveTenant(req, _res, next) {
  try {
    req.tenant = await tenantService.resolveForPrincipal(req.principal ?? {});
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Rejects requests from principals with no organization membership. */
export function requireTenant(req, _res, next) {
  const tenant = req.tenant;
  if (tenant?.isSuperAdmin || (tenant?.organizationIds?.length ?? 0) > 0) return next();
  return next(new ForbiddenError(ORG_ERRORS.NO_TENANT));
}

export default resolveTenant;
