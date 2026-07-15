import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { paymentIntentService } from '../services/payment-intent.service.js';
import { paymentService } from '../services/payment.service.js';

import { guestScopeOf, idempotencyKeyOf } from './_helpers.js';

export const CustomerPaymentController = {
  /** POST /api/v1/payments/create-intent */
  createIntent: asyncHandler(async (req, res) => {
    const data = await paymentIntentService.createIntent(guestScopeOf(req), {
      ...req.body,
      idempotencyKey: idempotencyKeyOf(req),
    });
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  /** POST /api/v1/payments/confirm */
  confirm: asyncHandler(async (req, res) => {
    const data = await paymentService.confirm(guestScopeOf(req), {
      intentId: req.body.intentId,
      providerPayload: req.body.providerPayload,
      headers: req.headers,
    });
    ApiResponse.success(res, { data });
  }),

  /** GET /api/v1/payments/:id */
  getById: asyncHandler(async (req, res) => {
    const data = await paymentService.getForGuest(guestScopeOf(req), req.params.id);
    ApiResponse.success(res, { data });
  }),
};

export default CustomerPaymentController;
