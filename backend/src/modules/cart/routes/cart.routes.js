import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireGuest, resolveGuest } from '#modules/qr-ordering/index.js';

import { CartController } from '../controllers/cart.controller.js';
import {
  addItemSchema,
  applyCouponSchema,
  itemIdParamSchema,
  updateItemSchema,
} from '../validators/cart.validators.js';

const router = Router();

// Guest-session authenticated: the cart is owned by the QR guest session.
router.use(resolveGuest, requireGuest);

/**
 * @openapi
 * /api/v1/cart:
 *   post: { tags: [Cart], security: [{ bearerAuth: [] }], summary: Create (or return) the session's active cart, responses: { 201: { description: Cart } } }
 *   get: { tags: [Cart], security: [{ bearerAuth: [] }], summary: Get the session's active cart with full pricing, responses: { 200: { description: Cart } } }
 */
router.post('/', CartController.create);
router.get('/', CartController.get);

/**
 * @openapi
 * /api/v1/cart/items:
 *   post:
 *     tags: [Cart]
 *     security: [{ bearerAuth: [] }]
 *     summary: Add an item (server-side priced — clients never send prices)
 *     description: Supports Idempotency-Key + If-Match (optimistic version) headers.
 *     responses: { 201: { description: Updated cart }, 409: { description: Version conflict } }
 */
router.post('/items', validate({ body: addItemSchema }), CartController.addItem);

/**
 * @openapi
 * /api/v1/cart/items/{id}:
 *   patch: { tags: [Cart], security: [{ bearerAuth: [] }], summary: Update a cart item (quantity/instructions/notes), responses: { 200: { description: Updated cart }, 409: { description: Version conflict } } }
 *   delete: { tags: [Cart], security: [{ bearerAuth: [] }], summary: Remove a cart item, responses: { 200: { description: Updated cart } } }
 */
router
  .route('/items/:id')
  .patch(validate({ params: itemIdParamSchema, body: updateItemSchema }), CartController.updateItem)
  .delete(validate({ params: itemIdParamSchema }), CartController.removeItem);

/**
 * @openapi
 * /api/v1/cart/apply-coupon:
 *   post: { tags: [Cart], security: [{ bearerAuth: [] }], summary: Apply a coupon (validated by the Pricing Engine), responses: { 200: { description: Updated cart }, 400: { description: Coupon not applicable } } }
 * /api/v1/cart/remove-coupon:
 *   delete: { tags: [Cart], security: [{ bearerAuth: [] }], summary: Remove the applied coupon, responses: { 200: { description: Updated cart } } }
 * /api/v1/cart/recalculate:
 *   post: { tags: [Cart], security: [{ bearerAuth: [] }], summary: Re-validate against live catalog and recompute pricing, responses: { 200: { description: Updated cart } } }
 * /api/v1/cart/checkout:
 *   post: { tags: [Cart], security: [{ bearerAuth: [] }], summary: Lock the cart for checkout (order-conversion boundary), responses: { 200: { description: Locked cart with final pricing }, 400: { description: Empty cart } } }
 */
router.post('/apply-coupon', validate({ body: applyCouponSchema }), CartController.applyCoupon);
router.delete('/remove-coupon', CartController.removeCoupon);
router.post('/recalculate', CartController.recalculate);
router.post('/checkout', CartController.lockForCheckout);

export default router;
