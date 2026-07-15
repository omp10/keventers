import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { VariantController } from '../controllers/variant.controller.js';
import { idParamSchema } from '../validators/common.validators.js';
import { updateVariantSchema } from '../validators/variant.validators.js';

import { restaurantGuards } from './_guards.js';

const router = Router();

router.use(...restaurantGuards);

/**
 * @openapi
 * /api/v1/restaurant/variants/{id}:
 *   get: { tags: [Catalog/Variants], security: [{ bearerAuth: [] }], summary: Get a variant, responses: { 200: { description: Variant } } }
 *   patch: { tags: [Catalog/Variants], security: [{ bearerAuth: [] }], summary: Update a variant (own price/SKU/availability/prep time), responses: { 200: { description: Updated } } }
 *   delete: { tags: [Catalog/Variants], security: [{ bearerAuth: [] }], summary: Soft-delete a variant, responses: { 200: { description: Deleted } } }
 */
router
  .route('/:id')
  .get(validate({ params: idParamSchema }), VariantController.getById)
  .patch(validate({ params: idParamSchema, body: updateVariantSchema }), VariantController.update)
  .delete(validate({ params: idParamSchema }), VariantController.remove);

export default router;
