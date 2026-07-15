import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { invoiceService } from '../services/invoice.service.js';
import { paymentService } from '../services/payment.service.js';
import { refundService } from '../services/refund.service.js';
import { transactionService } from '../services/transaction.service.js';

import { actor, branchIdOf, idempotencyKeyOf, restaurantIdOf } from './_helpers.js';

export const RestaurantPaymentController = {
  listPayments: asyncHandler(async (req, res) => {
    const data = await paymentService.listForStaff(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getPayment: asyncHandler(async (req, res) => {
    const data = await paymentService.getForStaff(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),

  listTransactions: asyncHandler(async (req, res) => {
    const data = await transactionService.listForStaff(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  listRefunds: asyncHandler(async (req, res) => {
    const data = await refundService.listForStaff(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  requestRefund: asyncHandler(async (req, res) => {
    const data = await refundService.requestRefund(req.tenant, { ...req.body, idempotencyKey: idempotencyKeyOf(req) }, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  recordManualPayment: asyncHandler(async (req, res) => {
    const data = await paymentService.recordManualPayment(req.tenant, req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  listInvoices: asyncHandler(async (req, res) => {
    const data = await invoiceService.listForStaff(req.tenant, restaurantIdOf(req), branchIdOf(req), req.validatedQuery ?? {});
    ApiResponse.success(res, { data });
  }),

  getInvoice: asyncHandler(async (req, res) => {
    const data = await invoiceService.getForStaff(req.tenant, req.params.id);
    ApiResponse.success(res, { data });
  }),
};

export default RestaurantPaymentController;
