import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { ModifierController } from '../controllers/modifier.controller.js';
import { groupModifierParamSchema, idParamSchema } from '../validators/common.validators.js';
import {
  createModifierGroupSchema,
  createModifierSchema,
  listGroupsQuerySchema,
  updateModifierGroupSchema,
  updateModifierSchema,
} from '../validators/modifier.validators.js';

import { restaurantGuards } from './_guards.js';

const router = Router();

router.use(...restaurantGuards);

/**
 * @openapi
 * /api/v1/restaurant/modifiers:
 *   get: { tags: [Catalog/Modifiers], security: [{ bearerAuth: [] }], summary: List modifier groups, responses: { 200: { description: Paginated groups } } }
 *   post: { tags: [Catalog/Modifiers], security: [{ bearerAuth: [] }], summary: Create a modifier group (required, min/max selection), responses: { 201: { description: Created } } }
 */
router
  .route('/')
  .get(validate({ query: listGroupsQuerySchema }), ModifierController.listGroups)
  .post(validate({ body: createModifierGroupSchema }), ModifierController.createGroup);

/**
 * @openapi
 * /api/v1/restaurant/modifiers/{id}:
 *   get: { tags: [Catalog/Modifiers], security: [{ bearerAuth: [] }], summary: Get a modifier group with its modifiers, responses: { 200: { description: Group } } }
 *   patch: { tags: [Catalog/Modifiers], security: [{ bearerAuth: [] }], summary: Update a modifier group, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Catalog/Modifiers], security: [{ bearerAuth: [] }], summary: Delete a modifier group (cascades modifiers), responses: { 200: { description: Deleted } } }
 */
router
  .route('/:id')
  .get(validate({ params: idParamSchema }), ModifierController.getGroup)
  .patch(validate({ params: idParamSchema, body: updateModifierGroupSchema }), ModifierController.updateGroup)
  .delete(validate({ params: idParamSchema }), ModifierController.deleteGroup);

/**
 * @openapi
 * /api/v1/restaurant/modifiers/{id}/modifiers:
 *   post: { tags: [Catalog/Modifiers], security: [{ bearerAuth: [] }], summary: Add a modifier to a group, responses: { 201: { description: Created } } }
 * /api/v1/restaurant/modifiers/{id}/modifiers/{modifierId}:
 *   patch: { tags: [Catalog/Modifiers], security: [{ bearerAuth: [] }], summary: Update a modifier, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Catalog/Modifiers], security: [{ bearerAuth: [] }], summary: Remove a modifier, responses: { 200: { description: Deleted } } }
 */
router.post(
  '/:id/modifiers',
  validate({ params: idParamSchema, body: createModifierSchema }),
  ModifierController.addModifier,
);
router.patch(
  '/:id/modifiers/:modifierId',
  validate({ params: groupModifierParamSchema, body: updateModifierSchema }),
  ModifierController.updateModifier,
);
router.delete(
  '/:id/modifiers/:modifierId',
  validate({ params: groupModifierParamSchema }),
  ModifierController.removeModifier,
);

export default router;
