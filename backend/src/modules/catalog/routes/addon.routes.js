import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { AddonController } from '../controllers/addon.controller.js';
import {
  createAddonSchema,
  listAddonsQuerySchema,
  updateAddonSchema,
} from '../validators/addon.validators.js';
import { idParamSchema } from '../validators/common.validators.js';
import { singleImageUpload } from '../middleware/upload.middleware.js';

import { restaurantGuards } from './_guards.js';

const router = Router();

router.use(...restaurantGuards);

/**
 * @openapi
 * /api/v1/restaurant/addons:
 *   get: { tags: [Catalog/Addons], security: [{ bearerAuth: [] }], summary: List add-ons, responses: { 200: { description: Paginated add-ons } } }
 *   post: { tags: [Catalog/Addons], security: [{ bearerAuth: [] }], summary: Create a reusable add-on, responses: { 201: { description: Created } } }
 */
router
  .route('/')
  .get(validate({ query: listAddonsQuerySchema }), AddonController.list)
  .post(validate({ body: createAddonSchema }), AddonController.create);

/**
 * @openapi
 * /api/v1/restaurant/addons/{id}:
 *   get: { tags: [Catalog/Addons], security: [{ bearerAuth: [] }], summary: Get an add-on, responses: { 200: { description: Add-on } } }
 *   patch: { tags: [Catalog/Addons], security: [{ bearerAuth: [] }], summary: Update an add-on, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Catalog/Addons], security: [{ bearerAuth: [] }], summary: Soft-delete an add-on, responses: { 200: { description: Deleted } } }
 */
router
  .route('/:id')
  .get(validate({ params: idParamSchema }), AddonController.getById)
  .patch(validate({ params: idParamSchema, body: updateAddonSchema }), AddonController.update)
  .delete(validate({ params: idParamSchema }), AddonController.remove);

/**
 * @openapi
 * /api/v1/restaurant/addons/{id}/image:
 *   post: { tags: [Catalog/Addons], security: [{ bearerAuth: [] }], summary: Upload an add-on image (multipart, field `image`), responses: { 200: { description: Updated } } }
 */
router.post('/:id/image', validate({ params: idParamSchema }), singleImageUpload, AddonController.uploadImage);

export default router;
