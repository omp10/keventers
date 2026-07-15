import { buildGuestScope } from '../utils/tenant.util.js';

export const actor = (req) => req.principal?.id ?? null;
export const guestScopeOf = (req) => buildGuestScope(req.guest);
export const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;
export const branchIdOf = (req) => req.validatedQuery?.branchId ?? req.query?.branchId ?? undefined;
export const idempotencyKeyOf = (req) => req.headers['idempotency-key'] || undefined;
