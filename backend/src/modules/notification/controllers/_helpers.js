import { buildRecipientScope } from '../utils/tenant.util.js';

export const actor = (req) => req.principal?.id ?? null;
export const recipientScopeOf = (req) => buildRecipientScope(req.guest);
export const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? req.body?.restaurantId ?? undefined;
export const queryOf = (req) => req.validatedQuery ?? req.query ?? {};
