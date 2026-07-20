import { UnauthorizedError } from '#core/errors/app-error.js';

import { customerRepository } from '../repositories/customer.repository.js';
import { buildAccountCustomerScope, buildCustomerScope } from '../utils/tenant.util.js';

/**
 * Resolve WHO this customer is, from either of the two ways they can arrive, and
 * attach the result as `req.customerScope`.
 *
 *  1. A guest session linked to an account — someone at a table. The signed guest
 *     token names the organization, restaurant, branch and session, so the scope
 *     is exact.
 *  2. A signed-in account with no guest session — someone opening their profile
 *     away from a table. Scoped to the restaurant they used most recently.
 *
 * Both are legitimate. Requiring (1) everywhere is what made the whole
 * `/customer/*` surface answer 401 to a properly authenticated customer: profile,
 * loyalty, orders and addresses were all unreachable unless you were physically
 * sitting at a table, which is not what any of those pages are for.
 *
 * `req.customerScope` may be null (authenticated, but has never ordered) — that
 * is an empty state, not a failure. Endpoints that cannot answer without a scope
 * use `customerScopeOf`, which rejects; the ones that can degrade check for null.
 */
export function resolveCustomerScope(deps = {}) {
  const customers = deps.customers ?? customerRepository;

  return async function resolveCustomerScopeMiddleware(req, _res, next) {
    try {
      // A valid table session is identity enough — an account link is optional.
      if (req.guest?.sessionId) {
        req.customerScope = buildCustomerScope(req.guest);
        return next();
      }
      if (req.principal?.authenticated) {
        req.customerScope = await buildAccountCustomerScope(req.principal.id, customers);
        return next();
      }
      return next(new UnauthorizedError());
    } catch (err) {
      return next(err);
    }
  };
}
