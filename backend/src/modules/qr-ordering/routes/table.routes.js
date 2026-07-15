import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { TableController } from '../controllers/table.controller.js';
import { idParamSchema, listQuerySchema } from '../validators/common.validators.js';
import {
  createTableSchema,
  setTableStatusSchema,
  updateTableSchema,
} from '../validators/table.validators.js';

import { managementGuards } from './_guards.js';

const router = Router();

router.use(...managementGuards);

/**
 * @openapi
 * /api/v1/restaurant/tables:
 *   get: { tags: [Tables], security: [{ bearerAuth: [] }], summary: List tables (?restaurantId=&branchId=, pagination/filter/search), responses: { 200: { description: Paginated tables } } }
 *   post: { tags: [Tables], security: [{ bearerAuth: [] }], summary: Create a table (?branchId=), responses: { 201: { description: Created } } }
 */
router
  .route('/')
  .get(validate({ query: listQuerySchema }), TableController.list)
  .post(validate({ body: createTableSchema }), TableController.create);

/**
 * @openapi
 * /api/v1/restaurant/tables/{id}:
 *   get: { tags: [Tables], security: [{ bearerAuth: [] }], summary: Get a table, responses: { 200: { description: Table } } }
 *   patch: { tags: [Tables], security: [{ bearerAuth: [] }], summary: Update a table, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Tables], security: [{ bearerAuth: [] }], summary: Soft-delete a table (deactivates its QR), responses: { 200: { description: Deleted } } }
 */
router
  .route('/:id')
  .get(validate({ params: idParamSchema }), TableController.getById)
  .patch(validate({ params: idParamSchema, body: updateTableSchema }), TableController.update)
  .delete(validate({ params: idParamSchema }), TableController.remove);

/**
 * @openapi
 * /api/v1/restaurant/tables/{id}/status:
 *   patch: { tags: [Tables], security: [{ bearerAuth: [] }], summary: Set table operational status, responses: { 200: { description: Updated } } }
 */
router.patch('/:id/status', validate({ params: idParamSchema, body: setTableStatusSchema }), TableController.setStatus);

export default router;
