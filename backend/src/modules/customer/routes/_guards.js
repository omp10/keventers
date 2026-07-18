import { requireAuth, requirePermission, requireRole } from '#platform/auth/index.js';
import { ORG_ROLES, requireTenant, resolveTenant } from '#modules/organization/index.js';
import { resolveGuest } from '#modules/qr-ordering/index.js';

import { CUSTOMER_PERMISSIONS } from '../constants/customer.constants.js';

import { resolveCustomerScope } from './_resolve-customer-scope.js';

/**
 * Route guard stacks. A customer identifies EITHER by a linked guest session (at
 * a table) OR by a signed-in account (anywhere else) — see `resolveCustomerScope`,
 * which accepts both and rejects neither. `resolveGuest` stays first so a guest
 * token is still read when present; it does not require one.
 *
 * Restaurant endpoints require staff roles + tenant scope; sensitive
 * loyalty/reward mutations additionally require a fine-grained permission. Admin
 * endpoints require the Super Admin.
 */
export const customerGuards = [resolveGuest, resolveCustomerScope()];

export const managementGuards = [
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER, ORG_ROLES.BRANCH_MANAGER, ORG_ROLES.SUPER_ADMIN),
];

export const adminGuards = [requireAuth, resolveTenant, requireRole(ORG_ROLES.SUPER_ADMIN)];

/** Fine-grained permission gate (composed after managementGuards). */
export const requireLoyaltyAdjust = requirePermission(CUSTOMER_PERMISSIONS.LOYALTY_ADJUST);
export const requireRewardManage = requirePermission(CUSTOMER_PERMISSIONS.REWARD_MANAGE);
export const requireCustomerManage = requirePermission(CUSTOMER_PERMISSIONS.CUSTOMER_MANAGE);
