import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth, requireRole } from '#platform/auth/index.js';

import { ORG_ROLES } from '../constants/organization.constants.js';
import {
  CategoryAdminController,
  KitchenAdminController,
  MediaController,
  ZoneAdminController,
} from '../controllers/admin-content.controller.js';
import { singleMediaUpload } from '../middleware/media-upload.middleware.js';
import { idParamSchema } from '../validators/common.validators.js';
import {
  createCategorySchema,
  createKitchenSchema,
  createZoneSchema,
  listCategoriesQuerySchema,
  listKitchensQuerySchema,
  listZonesQuerySchema,
  reorderSchema,
  updateCategorySchema,
  updateKitchenSchema,
  updateZoneSchema,
} from '../validators/discovery.validators.js';

/**
 * PLATFORM CONTENT admin routers — storefront categories, operating zones,
 * outlet discovery profiles and the shared image upload. All super-admin only.
 *
 * @openapi
 * /api/v1/admin/categories:
 *   get: { tags: [Content/Admin], security: [{ bearerAuth: [] }], summary: List storefront categories, responses: { 200: { description: Paginated categories } } }
 *   post: { tags: [Content/Admin], security: [{ bearerAuth: [] }], summary: Create a category, responses: { 201: { description: Created } } }
 * /api/v1/admin/categories/reorder:
 *   post: { tags: [Content/Admin], security: [{ bearerAuth: [] }], summary: Persist category display order, responses: { 200: { description: Reordered } } }
 * /api/v1/admin/categories/{id}:
 *   patch: { tags: [Content/Admin], security: [{ bearerAuth: [] }], summary: Update a category, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Content/Admin], security: [{ bearerAuth: [] }], summary: Delete a category, responses: { 200: { description: Deleted } } }
 * /api/v1/admin/zones:
 *   get: { tags: [Content/Admin], security: [{ bearerAuth: [] }], summary: List operating zones, responses: { 200: { description: Paginated zones } } }
 *   post: { tags: [Content/Admin], security: [{ bearerAuth: [] }], summary: Create a zone (center + radius), responses: { 201: { description: Created } } }
 * /api/v1/admin/zones/{id}:
 *   patch: { tags: [Content/Admin], security: [{ bearerAuth: [] }], summary: Update a zone, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Content/Admin], security: [{ bearerAuth: [] }], summary: Delete a zone, responses: { 200: { description: Deleted } } }
 * /api/v1/admin/kitchens:
 *   get: { tags: [Kitchens/Admin], security: [{ bearerAuth: [] }], summary: List outlets with their discovery profile, responses: { 200: { description: Paginated kitchens } } }
 *   post: { tags: [Kitchens/Admin], security: [{ bearerAuth: [] }], summary: Create an outlet, responses: { 201: { description: Created } } }
 * /api/v1/admin/kitchens/restaurants:
 *   get: { tags: [Kitchens/Admin], security: [{ bearerAuth: [] }], summary: Restaurant options for the kitchen form, responses: { 200: { description: Options } } }
 * /api/v1/admin/kitchens/{id}:
 *   get: { tags: [Kitchens/Admin], security: [{ bearerAuth: [] }], summary: Get an outlet, responses: { 200: { description: Kitchen } } }
 *   patch: { tags: [Kitchens/Admin], security: [{ bearerAuth: [] }], summary: Update an outlet / its discovery profile, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Kitchens/Admin], security: [{ bearerAuth: [] }], summary: Delete an outlet, responses: { 200: { description: Deleted } } }
 * /api/v1/admin/media/upload:
 *   post: { tags: [Content/Admin], security: [{ bearerAuth: [] }], summary: Upload an image (multipart `file`) via the Storage Platform, responses: { 201: { description: Uploaded URL + key } } }
 */

const guard = [requireAuth, requireRole(ORG_ROLES.SUPER_ADMIN)];

export const categoryAdminRouter = Router();
categoryAdminRouter.use(...guard);
categoryAdminRouter
  .route('/')
  .get(validate({ query: listCategoriesQuerySchema }), CategoryAdminController.list)
  .post(validate({ body: createCategorySchema }), CategoryAdminController.create);
// Static path first so 'reorder' is never captured as an :id.
categoryAdminRouter.post('/reorder', validate({ body: reorderSchema }), CategoryAdminController.reorder);
categoryAdminRouter
  .route('/:id')
  .patch(validate({ params: idParamSchema, body: updateCategorySchema }), CategoryAdminController.update)
  .delete(validate({ params: idParamSchema }), CategoryAdminController.remove);

export const zoneAdminRouter = Router();
zoneAdminRouter.use(...guard);
zoneAdminRouter
  .route('/')
  .get(validate({ query: listZonesQuerySchema }), ZoneAdminController.list)
  .post(validate({ body: createZoneSchema }), ZoneAdminController.create);
zoneAdminRouter
  .route('/:id')
  .patch(validate({ params: idParamSchema, body: updateZoneSchema }), ZoneAdminController.update)
  .delete(validate({ params: idParamSchema }), ZoneAdminController.remove);

export const kitchenAdminRouter = Router();
kitchenAdminRouter.use(...guard);
kitchenAdminRouter
  .route('/')
  .get(validate({ query: listKitchensQuerySchema }), KitchenAdminController.list)
  .post(validate({ body: createKitchenSchema }), KitchenAdminController.create);
kitchenAdminRouter.get('/restaurants', KitchenAdminController.restaurants);
kitchenAdminRouter
  .route('/:id')
  .get(validate({ params: idParamSchema }), KitchenAdminController.get)
  .patch(validate({ params: idParamSchema, body: updateKitchenSchema }), KitchenAdminController.update)
  .delete(validate({ params: idParamSchema }), KitchenAdminController.remove);

export const mediaAdminRouter = Router();
mediaAdminRouter.use(...guard);
mediaAdminRouter.post('/upload', singleMediaUpload, MediaController.upload);
