import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';
import { orderService } from '#modules/order/index.js';

import { customerService } from '../services/customer.service.js';
import { loyaltyService } from '../services/loyalty.service.js';
import { rewardService } from '../services/reward.service.js';

import { customerScopeOf, idempotencyKeyOf, queryOf } from './_helpers.js';

/**
 * Customer-facing endpoints — guest-session authenticated AND linked to a
 * registered account (scope + userId come from the signed guest token). Order
 * history is served through the Order module's guest listing (session-scoped),
 * never recomputed here.
 */
export const CustomerController = {
  /** GET /api/v1/customer/profile */
  getProfile: asyncHandler(async (req, res) => {
    const data = await customerService.getProfile(customerScopeOf(req));
    ApiResponse.success(res, { data });
  }),

  /** PATCH /api/v1/customer/profile */
  updateProfile: asyncHandler(async (req, res) => {
    const data = await customerService.updateProfile(customerScopeOf(req), req.body);
    ApiResponse.success(res, { data });
  }),

  /**
   * GET /api/v1/customer/orders — the customer's own order history.
   *
   * Scoped by identity, not by table session: "your orders" means every order
   * this person has placed, which is what they came to the page to see. The id is
   * taken from the resolved scope (a signed guest token or the authenticated
   * principal), never from the client.
   */
  getOrders: asyncHandler(async (req, res) => {
    const data = await orderService.listForCustomer(customerScopeOf(req).userId, queryOf(req));
    ApiResponse.success(res, { data });
  }),

  /** GET /api/v1/customer/loyalty */
  getLoyalty: asyncHandler(async (req, res) => {
    const scope = customerScopeOf(req);
    const { customerId } = await customerService.ensureCustomer({ organizationId: scope.organizationId, restaurantId: scope.restaurantId }, scope.userId);
    const account = await loyaltyService.getAccountForCustomer({ organizationId: scope.organizationId, restaurantId: scope.restaurantId }, customerId, scope.userId);
    const ledger = await loyaltyService.getLedgerForCustomer(customerId, queryOf(req));
    ApiResponse.success(res, { data: { account, ledger } });
  }),

  /** GET /api/v1/customer/rewards */
  getRewards: asyncHandler(async (req, res) => {
    const data = await rewardService.listActiveForCustomer(customerScopeOf(req));
    ApiResponse.success(res, { data });
  }),

  /** POST /api/v1/customer/redeem */
  redeem: asyncHandler(async (req, res) => {
    const data = await rewardService.redeem(customerScopeOf(req), req.body.rewardId, { idempotencyKey: idempotencyKeyOf(req) });
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  /** GET /api/v1/customer/redemptions */
  getRedemptions: asyncHandler(async (req, res) => {
    const data = await rewardService.listRedemptionsForCustomer(customerScopeOf(req));
    ApiResponse.success(res, { data });
  }),

  /** GET /api/v1/customer/preferences */
  getPreferences: asyncHandler(async (req, res) => {
    const data = await customerService.getPreferences(customerScopeOf(req));
    ApiResponse.success(res, { data });
  }),

  /** PATCH /api/v1/customer/preferences */
  updatePreferences: asyncHandler(async (req, res) => {
    const data = await customerService.updatePreferences(customerScopeOf(req), req.body);
    ApiResponse.success(res, { data });
  }),

  // --- addresses ---
  listAddresses: asyncHandler(async (req, res) => {
    const data = await customerService.listAddresses(customerScopeOf(req));
    ApiResponse.success(res, { data });
  }),
  addAddress: asyncHandler(async (req, res) => {
    const data = await customerService.addAddress(customerScopeOf(req), req.body);
    ApiResponse.success(res, { data, statusCode: 201 });
  }),
  updateAddress: asyncHandler(async (req, res) => {
    const data = await customerService.updateAddress(customerScopeOf(req), req.params.id, req.body);
    ApiResponse.success(res, { data });
  }),
  removeAddress: asyncHandler(async (req, res) => {
    const data = await customerService.removeAddress(customerScopeOf(req), req.params.id);
    ApiResponse.success(res, { data });
  }),
};

export default CustomerController;
