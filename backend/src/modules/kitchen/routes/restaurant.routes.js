import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { KitchenController } from '../controllers/kitchen.controller.js';
import { StationController } from '../controllers/station.controller.js';
import {
  assignSchema,
  createSlaTargetSchema,
  createStationSchema,
  listQueueQuerySchema,
  listStationsQuerySchema,
  orderIdParamSchema,
  reasonSchema,
  setPrioritySchema,
  stationIdParamSchema,
  updateStationSchema,
} from '../validators/kitchen.validators.js';

import { managementGuards } from './_guards.js';

const router = Router();

router.use(...managementGuards);

/**
 * @openapi
 * /api/v1/restaurant/kitchen/queue:
 *   get: { tags: [Kitchen], security: [{ bearerAuth: [] }], summary: Live kitchen board (?restaurantId=&branchId=&status=&stationId=&chefId=&priority=), responses: { 200: { description: Priority-ordered board } } }
 */
router.get('/queue', validate({ query: listQueueQuerySchema }), KitchenController.queue);

/**
 * @openapi
 * /api/v1/restaurant/kitchen/stations:
 *   get: { tags: [Kitchen/Stations], security: [{ bearerAuth: [] }], summary: List stations, responses: { 200: { description: Stations } } }
 *   post: { tags: [Kitchen/Stations], security: [{ bearerAuth: [] }], summary: Create a station (with routing rules), responses: { 201: { description: Created } } }
 * /api/v1/restaurant/kitchen/stations/{id}:
 *   get: { tags: [Kitchen/Stations], security: [{ bearerAuth: [] }], summary: Get a station, responses: { 200: { description: Station } } }
 *   patch: { tags: [Kitchen/Stations], security: [{ bearerAuth: [] }], summary: Update a station, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Kitchen/Stations], security: [{ bearerAuth: [] }], summary: Delete a station (no active orders), responses: { 200: { description: Deleted } } }
 */
router
  .route('/stations')
  .get(validate({ query: listStationsQuerySchema }), StationController.list)
  .post(validate({ body: createStationSchema }), StationController.create);
router
  .route('/stations/:id')
  .get(validate({ params: stationIdParamSchema }), StationController.getById)
  .patch(validate({ params: stationIdParamSchema, body: updateStationSchema }), StationController.update)
  .delete(validate({ params: stationIdParamSchema }), StationController.remove);

/**
 * @openapi
 * /api/v1/restaurant/kitchen/sla:
 *   get: { tags: [Kitchen/SLA], security: [{ bearerAuth: [] }], summary: List SLA prep targets, responses: { 200: { description: Targets } } }
 *   post: { tags: [Kitchen/SLA], security: [{ bearerAuth: [] }], summary: Create an SLA prep target (product/category/default), responses: { 201: { description: Created } } }
 * /api/v1/restaurant/kitchen/sla/{id}:
 *   delete: { tags: [Kitchen/SLA], security: [{ bearerAuth: [] }], summary: Delete an SLA target, responses: { 200: { description: Deleted } } }
 */
router.route('/sla').get(StationController.listSla).post(validate({ body: createSlaTargetSchema }), StationController.createSla);
router.delete('/sla/:id', validate({ params: stationIdParamSchema }), StationController.removeSla);

/**
 * @openapi
 * /api/v1/restaurant/kitchen/orders/{id}:
 *   get: { tags: [Kitchen], security: [{ bearerAuth: [] }], summary: Get a kitchen order (by ORDER id) with timers + timeline, responses: { 200: { description: Kitchen order } } }
 * /api/v1/restaurant/kitchen/orders/{id}/assign:
 *   patch: { tags: [Kitchen], security: [{ bearerAuth: [] }], summary: Assign/reassign a chef (auto when chefId omitted), responses: { 200: { description: Assigned } } }
 * /api/v1/restaurant/kitchen/orders/{id}/preparing:
 *   patch: { tags: [Kitchen], security: [{ bearerAuth: [] }], summary: Start preparing, responses: { 200: { description: Preparing } } }
 * /api/v1/restaurant/kitchen/orders/{id}/ready:
 *   patch: { tags: [Kitchen], security: [{ bearerAuth: [] }], summary: Mark ready, responses: { 200: { description: Ready } } }
 * /api/v1/restaurant/kitchen/orders/{id}/served:
 *   patch: { tags: [Kitchen], security: [{ bearerAuth: [] }], summary: Mark served, responses: { 200: { description: Served } } }
 * /api/v1/restaurant/kitchen/orders/{id}/recall:
 *   patch: { tags: [Kitchen], security: [{ bearerAuth: [] }], summary: Recall (PREPARING → RECALLED), responses: { 200: { description: Recalled } } }
 * /api/v1/restaurant/kitchen/orders/{id}/refire:
 *   patch: { tags: [Kitchen], security: [{ bearerAuth: [] }], summary: Refire (READY → REFIRED), responses: { 200: { description: Refired } } }
 * /api/v1/restaurant/kitchen/orders/{id}/priority:
 *   patch: { tags: [Kitchen], security: [{ bearerAuth: [] }], summary: Change queue priority, responses: { 200: { description: Updated } } }
 */
router.get('/orders/:id', validate({ params: orderIdParamSchema }), KitchenController.getEntry);
router.patch('/orders/:id/assign', validate({ params: orderIdParamSchema, body: assignSchema }), KitchenController.assign);
router.patch('/orders/:id/preparing', validate({ params: orderIdParamSchema }), KitchenController.preparing);
router.patch('/orders/:id/ready', validate({ params: orderIdParamSchema }), KitchenController.ready);
router.patch('/orders/:id/served', validate({ params: orderIdParamSchema }), KitchenController.served);
router.patch('/orders/:id/recall', validate({ params: orderIdParamSchema, body: reasonSchema }), KitchenController.recall);
router.patch('/orders/:id/refire', validate({ params: orderIdParamSchema, body: reasonSchema }), KitchenController.refire);
router.patch('/orders/:id/priority', validate({ params: orderIdParamSchema, body: setPrioritySchema }), KitchenController.setPriority);

export default router;
