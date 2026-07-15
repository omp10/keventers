import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { AdminOrderController } from '../controllers/admin-order.controller.js';
import { idParamSchema, listOrdersQuerySchema } from '../validators/order.validators.js';

import { adminGuards } from './_guards.js';

const router = Router();

router.use(...adminGuards);

/**
 * @openapi
 * /api/v1/admin/orders:
 *   get: { tags: [Admin/Orders], security: [{ bearerAuth: [] }], summary: Inspect orders across a restaurant (?restaurantId=&branchId=), responses: { 200: { description: Paginated orders } } }
 * /api/v1/admin/orders/{id}:
 *   get: { tags: [Admin/Orders], security: [{ bearerAuth: [] }], summary: Inspect an order (full snapshot view), responses: { 200: { description: Order } } }
 */
router.get('/', validate({ query: listOrdersQuerySchema }), AdminOrderController.list);
router.get('/:id', validate({ params: idParamSchema }), AdminOrderController.getById);

export default router;
