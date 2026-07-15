import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { customerService } from '../services/customer.service.js';
import { rewardService } from '../services/reward.service.js';

import { actor, queryOf, restaurantIdOf } from './_helpers.js';

/**
 * Restaurant staff endpoints — tenant-scoped customer CRM, loyalty administration
 * and reward catalog management. Every read/write is isolated to the staff
 * member's restaurant (resolved server-side; client ids are never trusted).
 */
export const RestaurantCustomerController = {
  // --- customers ---
  listCustomers: asyncHandler(async (req, res) => {
    const data = await customerService.listForStaff(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),

  getCustomer: asyncHandler(async (req, res) => {
    const data = await customerService.getForStaff(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  setCustomerStatus: asyncHandler(async (req, res) => {
    const data = await customerService.setAccountStatus(req.tenant, req.params.id, req.body.status, actor(req));
    ApiResponse.success(res, { data });
  }),

  // --- loyalty ---
  listLoyalty: asyncHandler(async (req, res) => {
    const data = await customerService.listForStaff(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),

  getCustomerLedger: asyncHandler(async (req, res) => {
    const data = await customerService.getLedgerForStaff(req.tenant, req.params.id, queryOf(req));
    ApiResponse.success(res, { data });
  }),

  /** Manual points adjustment (audited). Requires loyalty:adjust. */
  adjustPoints: asyncHandler(async (req, res) => {
    const data = await customerService.adjustLoyalty(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  // --- rewards catalog ---
  listRewards: asyncHandler(async (req, res) => {
    const data = await rewardService.listRewards(req.tenant, restaurantIdOf(req), queryOf(req));
    ApiResponse.success(res, { data });
  }),
  createReward: asyncHandler(async (req, res) => {
    const data = await rewardService.createReward(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),
  updateReward: asyncHandler(async (req, res) => {
    const data = await rewardService.updateReward(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),
  deleteReward: asyncHandler(async (req, res) => {
    const data = await rewardService.deleteReward(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default RestaurantCustomerController;
