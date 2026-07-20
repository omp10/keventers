import { buildRecipientScope } from '../utils/tenant.util.js';

export const actor = (req) => req.principal?.id ?? null;
/**
 * WHO the inbox belongs to. A table guest is identified by their session; a
 * signed-in customer or staff member by their account (the inbox is keyed on
 * userId when there is one). Tenant fields come from the guest token, or from
 * the resolved tenant for an account caller — only preferences need them.
 */
export const recipientScopeOf = (req) => {
  if (req.guest?.sessionId) return buildRecipientScope(req.guest);
  if (!req.principal?.authenticated) return buildRecipientScope(req.guest); // throws the usual 403
  return {
    organizationId: req.tenant?.organizationId ? String(req.tenant.organizationId) : null,
    restaurantId: req.tenant?.primaryRestaurantId ? String(req.tenant.primaryRestaurantId) : null,
    branchId: null,
    sessionId: null,
    userId: String(req.principal.id),
  };
};
export const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? req.body?.restaurantId ?? undefined;
export const queryOf = (req) => req.validatedQuery ?? req.query ?? {};
