import { buildCustomerScope } from '../utils/tenant.util.js';

export const actor = (req) => req.principal?.id ?? null;
export const customerScopeOf = (req) => buildCustomerScope(req.guest);
export const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;
export const idempotencyKeyOf = (req) => req.headers['idempotency-key'] || undefined;
export const queryOf = (req) => req.validatedQuery ?? req.query ?? {};
