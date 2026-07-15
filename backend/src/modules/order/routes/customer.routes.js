import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { CustomerOrderController } from '../controllers/customer-order.controller.js';
import {
  cancelSchema,
  idParamSchema,
  listOrdersQuerySchema,
} from '../validators/order.validators.js';

import { customerGuards } from './_guards.js';

const router = Router();

router.use(...customerGuards);

/**
 * @openapi
 * /api/v1/orders:
 *   post:
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     summary: Checkout — turn the session's cart into an order
 *     description: Locks the cart (Pricing Engine runs), snapshots everything, and places the order. Supports Idempotency-Key. Never creates orders directly or recomputes prices.
 *     responses: { 201: { description: Order }, 400: { description: Empty/absent cart } }
 *   get:
 *     tags: [Orders]
 *     security: [{ bearerAuth: [] }]
 *     summary: List the guest session's orders
 *     responses: { 200: { description: Paginated orders } }
 */
router
  .route('/')
  .post(CustomerOrderController.checkout)
  .get(validate({ query: listOrdersQuerySchema }), CustomerOrderController.list);

/**
 * @openapi
 * /api/v1/orders/{id}:
 *   get: { tags: [Orders], security: [{ bearerAuth: [] }], summary: Get one of the session's orders, responses: { 200: { description: Order } } }
 * /api/v1/orders/{id}/cancel:
 *   post: { tags: [Orders], security: [{ bearerAuth: [] }], summary: Cancel an order (only while PLACED/CONFIRMED), responses: { 200: { description: Cancelled }, 400: { description: Not cancellable } } }
 */
router.get('/:id', validate({ params: idParamSchema }), CustomerOrderController.getById);
router.post('/:id/cancel', validate({ params: idParamSchema, body: cancelSchema }), CustomerOrderController.cancel);

export default router;
