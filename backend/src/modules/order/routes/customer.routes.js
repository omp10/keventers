import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { CustomerOrderController } from '../controllers/customer-order.controller.js';
import {
  cancelSchema,
  idParamSchema,
  listOrdersQuerySchema,
} from '../validators/order.validators.js';

import { resolveGuest } from '#modules/qr-ordering/index.js';

import { customerGuards } from './_guards.js';

const router = Router();

/**
 * History accepts EITHER a live table session OR a signed-in account. It used
 * to sit behind the strict guest guard and query only the CURRENT session, so
 * a customer's orders vanished the moment that 2h session ended — even though
 * the account owned them. `resolveGuest` is non-throwing and the global
 * `authenticate` already attached any account principal; the controller picks
 * whichever scope is present, preferring the account (fuller history).
 */
router.get('/', resolveGuest, validate({ query: listOrdersQuerySchema }), CustomerOrderController.list);

// Everything below still requires a live table session (placing/cancelling).
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
