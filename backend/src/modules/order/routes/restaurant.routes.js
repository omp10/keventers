import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { RestaurantOrderController } from '../controllers/restaurant-order.controller.js';
import {
  addNoteSchema,
  cancelSchema,
  idParamSchema,
  listOrdersQuerySchema,
  refundRequestSchema,
  rejectRefundSchema,
  updateStatusSchema,
} from '../validators/order.validators.js';

import { managementGuards } from './_guards.js';

const router = Router();

router.use(...managementGuards);

/**
 * @openapi
 * /api/v1/restaurant/orders:
 *   get: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: List orders (?restaurantId=&branchId=&status=), responses: { 200: { description: Paginated orders } } }
 * /api/v1/restaurant/orders/{id}:
 *   get: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Get an order (full staff view), responses: { 200: { description: Order } } }
 */
router.get('/', validate({ query: listOrdersQuerySchema }), RestaurantOrderController.list);
router.get('/:id', validate({ params: idParamSchema }), RestaurantOrderController.getById);

/**
 * @openapi
 * /api/v1/restaurant/orders/{id}/status:
 *   patch: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Change order status (state-machine validated), responses: { 200: { description: Updated }, 400: { description: Illegal transition } } }
 * /api/v1/restaurant/orders/{id}/confirm:
 *   post: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Confirm (auto-requests a kitchen queue entry via event), responses: { 200: { description: Confirmed } } }
 * /api/v1/restaurant/orders/{id}/prepare:
 *   post: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Mark preparing, responses: { 200: { description: Preparing } } }
 * /api/v1/restaurant/orders/{id}/ready:
 *   post: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Mark ready, responses: { 200: { description: Ready } } }
 * /api/v1/restaurant/orders/{id}/serve:
 *   post: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Mark served, responses: { 200: { description: Served } } }
 * /api/v1/restaurant/orders/{id}/complete:
 *   post: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Mark completed, responses: { 200: { description: Completed } } }
 * /api/v1/restaurant/orders/{id}/cancel:
 *   post: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Cancel an order (with reason), responses: { 200: { description: Cancelled } } }
 */
router.patch('/:id/status', validate({ params: idParamSchema, body: updateStatusSchema }), RestaurantOrderController.updateStatus);
router.post('/:id/confirm', validate({ params: idParamSchema }), RestaurantOrderController.confirm);
router.post('/:id/prepare', validate({ params: idParamSchema }), RestaurantOrderController.prepare);
router.post('/:id/ready', validate({ params: idParamSchema }), RestaurantOrderController.ready);
router.post('/:id/serve', validate({ params: idParamSchema }), RestaurantOrderController.serve);
router.post('/:id/complete', validate({ params: idParamSchema }), RestaurantOrderController.complete);
router.post('/:id/cancel', validate({ params: idParamSchema, body: cancelSchema }), RestaurantOrderController.cancel);

/**
 * @openapi
 * /api/v1/restaurant/orders/{id}/notes:
 *   post: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Add a restaurant/kitchen note (permission-based visibility), responses: { 201: { description: Updated } } }
 * /api/v1/restaurant/orders/{id}/refund/request:
 *   post: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Request a refund (extension point — no money movement), responses: { 200: { description: Refund pending } } }
 * /api/v1/restaurant/orders/{id}/refund/approve:
 *   post: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Approve/complete a refund (extension point), responses: { 200: { description: Refunded } } }
 * /api/v1/restaurant/orders/{id}/refund/reject:
 *   post: { tags: [Restaurant/Orders], security: [{ bearerAuth: [] }], summary: Reject a refund (extension point), responses: { 200: { description: Rejected } } }
 */
router.post('/:id/notes', validate({ params: idParamSchema, body: addNoteSchema }), RestaurantOrderController.addNote);
router.post('/:id/refund/request', validate({ params: idParamSchema, body: refundRequestSchema }), RestaurantOrderController.requestRefund);
router.post('/:id/refund/approve', validate({ params: idParamSchema }), RestaurantOrderController.approveRefund);
router.post('/:id/refund/reject', validate({ params: idParamSchema, body: rejectRefundSchema }), RestaurantOrderController.rejectRefund);

export default router;
