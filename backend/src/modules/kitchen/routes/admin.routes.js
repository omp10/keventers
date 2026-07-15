import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { AdminKitchenController } from '../controllers/admin-kitchen.controller.js';
import { listQueueQuerySchema, orderIdParamSchema } from '../validators/kitchen.validators.js';

import { adminGuards } from './_guards.js';

const router = Router();

router.use(...adminGuards);

/**
 * @openapi
 * /api/v1/admin/kitchen:
 *   get: { tags: [Admin/Kitchen], security: [{ bearerAuth: [] }], summary: Inspect a branch kitchen board (?restaurantId=&branchId=), responses: { 200: { description: Board } } }
 * /api/v1/admin/kitchen/orders/{id}:
 *   get: { tags: [Admin/Kitchen], security: [{ bearerAuth: [] }], summary: Inspect a kitchen order (by ORDER id), responses: { 200: { description: Kitchen order } } }
 */
router.get('/', validate({ query: listQueueQuerySchema }), AdminKitchenController.board);
router.get('/orders/:id', validate({ params: orderIdParamSchema }), AdminKitchenController.getEntry);

export default router;
