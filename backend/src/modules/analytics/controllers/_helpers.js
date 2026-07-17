import { parseRange } from '../utils/date-range.util.js';

export const actor = (req) => req.principal?.id ?? null;
export const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? req.body?.restaurantId ?? undefined;
export const organizationIdOf = (req) => req.validatedQuery?.organizationId ?? req.query?.organizationId ?? undefined;
export const branchIdOf = (req) => req.validatedQuery?.branchId ?? req.query?.branchId ?? undefined;
export const rangeOf = (req) => parseRange(req.validatedQuery ?? req.query ?? {});

/**
 * The progressive scope an admin read is narrowed to. A super admin has no
 * primary tenant, so every level is optional and comes from the query.
 */
export const adminScopeOf = (req) => ({
  organizationId: organizationIdOf(req),
  restaurantId: restaurantIdOf(req),
  branchId: branchIdOf(req),
});
