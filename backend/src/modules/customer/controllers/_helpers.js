import { ForbiddenError } from '#core/errors/app-error.js';

import { CUSTOMER_ERRORS } from '../constants/customer.constants.js';

export const actor = (req) => req.principal?.id ?? null;

/**
 * The scope `resolveCustomerScope` put on the request — from a table session or a
 * signed-in account. Rejects when there is none, i.e. the account has never
 * ordered anywhere, so there is no restaurant to answer for. Endpoints that can
 * show an empty state instead should read `req.customerScope` directly.
 */
export const customerScopeOf = (req) => {
  if (!req.customerScope) throw new ForbiddenError(CUSTOMER_ERRORS.NOT_LINKED);
  return req.customerScope;
};
export const restaurantIdOf = (req) => req.validatedQuery?.restaurantId ?? req.query?.restaurantId ?? undefined;
export const idempotencyKeyOf = (req) => req.headers['idempotency-key'] || undefined;
export const queryOf = (req) => req.validatedQuery ?? req.query ?? {};
