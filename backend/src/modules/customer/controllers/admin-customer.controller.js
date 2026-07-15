import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { customerService } from '../services/customer.service.js';
import { rewardService } from '../services/reward.service.js';

import { actor, queryOf, restaurantIdOf } from './_helpers.js';

/**
 * Platform admin endpoints. A super admin operates ON a restaurant (passed as
 * `restaurantId`); the organization module's tenant context authorizes the
 * cross-tenant view. GDPR erasure lives here (privileged, audited).
 */
export const AdminCustomerController = {
  listCustomers: asyncHandler(async (req, res) => {
    const data = await customerService.listForStaff(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),

  getCustomer: asyncHandler(async (req, res) => {
    const data = await customerService.getForStaff(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  listLoyalty: asyncHandler(async (req, res) => {
    const data = await customerService.listForStaff(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),

  listRewards: asyncHandler(async (req, res) => {
    const data = await rewardService.listRewards(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),

  /** GDPR erasure — scrub PII, retain the ledger-consistent record. */
  eraseCustomer: asyncHandler(async (req, res) => {
    const data = await customerService.gdprErase(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default AdminCustomerController;
