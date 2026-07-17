import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { z } from 'zod';

import { KitchenController } from '../controllers/kitchen.controller.js';
import { listQueueQuerySchema, orderIdParamSchema } from '../validators/kitchen.validators.js';

import { staffGuards } from './_guards.js';

/**
 * STAFF "my work" router — the floor-staff phone app's entire backend surface.
 * Mounted at `/restaurant/kitchen/my` BEFORE the management router so these
 * paths never fall through to (and get rejected by) the manager-only guards.
 *
 * The chef identity is ALWAYS the authenticated principal: there is no way to
 * list or advance another person's orders from here.
 *
 * @openapi
 * /api/v1/restaurant/kitchen/my/queue:
 *   get: { tags: [Kitchen/Staff], security: [{ bearerAuth: [] }], summary: "Orders assigned to me (live worklist)", responses: { 200: { description: Paginated kitchen entries } } }
 * /api/v1/restaurant/kitchen/my/history:
 *   get: { tags: [Kitchen/Staff], security: [{ bearerAuth: [] }], summary: "My served/cancelled orders, newest first", responses: { 200: { description: Paginated kitchen entries } } }
 * /api/v1/restaurant/kitchen/my/orders/{id}/{action}:
 *   patch: { tags: [Kitchen/Staff], security: [{ bearerAuth: [] }], summary: "Advance MY order (action = preparing | ready | served)", responses: { 200: { description: Updated entry }, 403: { description: Not assigned to you } } }
 */
const router = Router();

router.use(...staffGuards);

const actionParamSchema = orderIdParamSchema.extend({
  action: z.enum(['preparing', 'ready', 'served']),
});

router.get('/queue', validate({ query: listQueueQuerySchema }), KitchenController.myQueue);
router.get('/history', validate({ query: listQueueQuerySchema }), KitchenController.myHistory);
router.patch('/orders/:id/:action', validate({ params: actionParamSchema }), KitchenController.myTransition);

export default router;
