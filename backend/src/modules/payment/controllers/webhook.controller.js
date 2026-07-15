import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { PROVIDER } from '../constants/payment.constants.js';
import { webhookService } from '../services/webhook.service.js';

/** The exact bytes the gateway signed (captured by the JSON parser's `verify`). */
const rawBodyOf = (req) => (req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body ?? {}));

export const WebhookController = {
  /** POST /api/v1/webhooks/razorpay */
  razorpay: asyncHandler(async (req, res) => {
    const data = await webhookService.handle(PROVIDER.RAZORPAY, { rawBody: rawBodyOf(req), headers: req.headers });
    ApiResponse.success(res, { data });
  }),

  /** POST /api/v1/webhooks/phonepe */
  phonepe: asyncHandler(async (req, res) => {
    const data = await webhookService.handle(PROVIDER.PHONEPE, { rawBody: rawBodyOf(req), headers: req.headers });
    ApiResponse.success(res, { data });
  }),
};

export default WebhookController;
