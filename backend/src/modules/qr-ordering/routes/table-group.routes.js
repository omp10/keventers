import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { TableGroupController } from '../controllers/table-group.controller.js';
import { idParamSchema, listQuerySchema } from '../validators/common.validators.js';
import {
  createTableGroupSchema,
  updateTableGroupSchema,
} from '../validators/table.validators.js';

import { managementGuards } from './_guards.js';

const router = Router();

router.use(...managementGuards);

/**
 * @openapi
 * /api/v1/restaurant/table-groups:
 *   get: { tags: [Tables/Groups], security: [{ bearerAuth: [] }], summary: List table groups (floors/zones), responses: { 200: { description: Paginated groups } } }
 *   post: { tags: [Tables/Groups], security: [{ bearerAuth: [] }], summary: Create a table group, responses: { 201: { description: Created } } }
 */
router
  .route('/')
  .get(validate({ query: listQuerySchema }), TableGroupController.list)
  .post(validate({ body: createTableGroupSchema }), TableGroupController.create);

/**
 * @openapi
 * /api/v1/restaurant/table-groups/{id}:
 *   get: { tags: [Tables/Groups], security: [{ bearerAuth: [] }], summary: Get a table group, responses: { 200: { description: Group } } }
 *   patch: { tags: [Tables/Groups], security: [{ bearerAuth: [] }], summary: Update a table group, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Tables/Groups], security: [{ bearerAuth: [] }], summary: Delete a table group (must be empty), responses: { 200: { description: Deleted } } }
 */
router
  .route('/:id')
  .get(validate({ params: idParamSchema }), TableGroupController.getById)
  .patch(validate({ params: idParamSchema, body: updateTableGroupSchema }), TableGroupController.update)
  .delete(validate({ params: idParamSchema }), TableGroupController.remove);

export default router;
