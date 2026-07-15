import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { paymentService } from '../services/payment.service.js';
import { settlementService } from '../services/settlement.service.js';
import { transactionService } from '../services/transaction.service.js';

import { actor, branchIdOf, restaurantIdOf } from './_helpers.js';

/** Platform Super-Admin financial inspection (?restaurantId=&branchId= required). */
export const AdminPaymentController = {
  listPayments: asyncHandler(async (req, res) => {
    const data = await paymentService.listForStaff(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  listTransactions: asyncHandler(async (req, res) => {
    const data = await transactionService.listForStaff(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  listSettlements: asyncHandler(async (req, res) => {
    const data = await settlementService.listSettlements(req.tenant, restaurantIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  createSettlement: asyncHandler(async (req, res) => {
    const data = await settlementService.createSettlement(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  completeSettlement: asyncHandler(async (req, res) => {
    const data = await settlementService.completeSettlement(req.tenant, req.params.id, req.body ?? {}, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default AdminPaymentController;
