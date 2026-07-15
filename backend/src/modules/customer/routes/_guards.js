import { requireAuth, requirePermission, requireRole } from '#platform/auth/index.js';
import { ORG_ROLES, requireTenant, resolveTenant } from '#modules/organization/index.js';
import { requireGuest, resolveGuest } from '#modules/qr-ordering/index.js';

import { CUSTOMER_PERMISSIONS } from '../constants/customer.constants.js';

/**
 * Route guard stacks. Customer endpoints are guest-session authenticated (and the
 * service further requires a LINKED account). Restaurant endpoints require staff
 * roles + tenant scope; sensitive loyalty/reward mutations additionally require a
 * fine-grained permission. Admin endpoints require the Super Admin.
 */
export const customerGuards = [resolveGuest, requireGuest];

export const managementGuards = [
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER, ORG_ROLES.BRANCH_MANAGER),
];

export const adminGuards = [requireAuth, resolveTenant, requireRole(ORG_ROLES.SUPER_ADMIN)];

/** Fine-grained permission gate (composed after managementGuards). */
export const requireLoyaltyAdjust = requirePermission(CUSTOMER_PERMISSIONS.LOYALTY_ADJUST);
export const requireRewardManage = requirePermission(CUSTOMER_PERMISSIONS.REWARD_MANAGE);
export const requireCustomerManage = requirePermission(CUSTOMER_PERMISSIONS.CUSTOMER_MANAGE);
