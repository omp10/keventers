import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { customerService } from '../services/customer.service.js';
import { feedbackService } from '../services/feedback.service.js';
import { customerScopeOf } from './_helpers.js';

const tenantOf = (req) => req.query?.restaurantId ?? req.tenant.primaryRestaurantId;

export const FeedbackController = {
  /* customer */
  submit: asyncHandler(async (req, res) => {
    const scope = customerScopeOf(req);
    // Bind to the customer when one exists; a pure guest submission still counts.
    let customerId = null;
    try {
      customerId = (await customerService.ensureCustomer({ organizationId: scope.organizationId, restaurantId: scope.restaurantId }, scope.userId)).customerId;
    } catch {
      /* guest without an account — feedback is still welcome */
    }
    const data = await feedbackService.submit(scope, req.body, { customerId, guestSessionId: scope.sessionId ?? null });
    ApiResponse.success(res, { data, statusCode: 201 });
  }),
  getForOrder: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await feedbackService.getForOrder(req.params.orderId) });
  }),

  /* management */
  list: asyncHandler(async (req, res) => {
    const { page, limit } = req.query ?? {};
    ApiResponse.success(res, { data: await feedbackService.listForRestaurant(tenantOf(req), { page: Number(page) || 1, limit: Math.min(100, Number(limit) || 25) }) });
  }),
  summary: asyncHandler(async (req, res) => {
    ApiResponse.success(res, { data: await feedbackService.summary(tenantOf(req)) });
  }),
};

export default FeedbackController;
