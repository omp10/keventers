import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { ProductController } from '../controllers/product.controller.js';
import { VariantController } from '../controllers/variant.controller.js';
import { productImagesUpload } from '../middleware/upload.middleware.js';
import { idParamSchema, productIdParamSchema } from '../validators/common.validators.js';
import {
  branchOverrideSchema,
  createProductSchema,
  listProductsQuerySchema,
  removeImageSchema,
  setAvailabilitySchema,
  updateProductSchema,
} from '../validators/product.validators.js';
import { createVariantSchema } from '../validators/variant.validators.js';

import { restaurantGuards } from './_guards.js';

const router = Router();

router.use(...restaurantGuards);

/**
 * @openapi
 * /api/v1/restaurant/products:
 *   get: { tags: [Catalog/Products], security: [{ bearerAuth: [] }], summary: List products (pagination/filter/search/sort — category, price, dietary, featured, popular, status), responses: { 200: { description: Paginated products } } }
 *   post: { tags: [Catalog/Products], security: [{ bearerAuth: [] }], summary: Create a product, responses: { 201: { description: Created } } }
 */
router
  .route('/')
  .get(validate({ query: listProductsQuerySchema }), ProductController.list)
  .post(validate({ body: createProductSchema }), ProductController.create);

/**
 * @openapi
 * /api/v1/restaurant/products/{id}:
 *   get: { tags: [Catalog/Products], security: [{ bearerAuth: [] }], summary: Get a product, responses: { 200: { description: Product } } }
 *   patch: { tags: [Catalog/Products], security: [{ bearerAuth: [] }], summary: Update a product, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Catalog/Products], security: [{ bearerAuth: [] }], summary: Soft-delete a product (cascades variants), responses: { 200: { description: Deleted } } }
 */
router
  .route('/:id')
  .get(validate({ params: idParamSchema }), ProductController.getById)
  .patch(validate({ params: idParamSchema, body: updateProductSchema }), ProductController.update)
  .delete(validate({ params: idParamSchema }), ProductController.remove);

/**
 * @openapi
 * /api/v1/restaurant/products/{id}/detail:
 *   get: { tags: [Catalog/Products], security: [{ bearerAuth: [] }], summary: Full product detail (variants + modifier groups + add-ons), responses: { 200: { description: Product detail } } }
 */
router.get('/:id/detail', validate({ params: idParamSchema }), ProductController.detail);

/**
 * @openapi
 * /api/v1/restaurant/products/{id}/images:
 *   post: { tags: [Catalog/Products], security: [{ bearerAuth: [] }], summary: Upload product gallery images (multipart, field `images`), responses: { 201: { description: Updated product } } }
 *   delete: { tags: [Catalog/Products], security: [{ bearerAuth: [] }], summary: Remove a product image by storage key, responses: { 200: { description: Updated product } } }
 */
router.post('/:id/images', validate({ params: idParamSchema }), productImagesUpload, ProductController.uploadImages);
router.delete(
  '/:id/images',
  validate({ params: idParamSchema, body: removeImageSchema }),
  ProductController.removeImage,
);

/**
 * @openapi
 * /api/v1/restaurant/products/{id}/availability:
 *   patch: { tags: [Catalog/Products], security: [{ bearerAuth: [] }], summary: Set restaurant-level product availability, responses: { 200: { description: Updated } } }
 * /api/v1/restaurant/products/{id}/availability/branch:
 *   post: { tags: [Catalog/Products], security: [{ bearerAuth: [] }], summary: Upsert a branch-specific availability override, responses: { 201: { description: Override } } }
 *   get: { tags: [Catalog/Products], security: [{ bearerAuth: [] }], summary: List a product's branch overrides, responses: { 200: { description: Overrides } } }
 */
router.patch(
  '/:id/availability',
  validate({ params: idParamSchema, body: setAvailabilitySchema }),
  ProductController.setAvailability,
);
router
  .route('/:id/availability/branch')
  .get(validate({ params: idParamSchema }), ProductController.listOverrides)
  .post(
    validate({ params: idParamSchema, body: branchOverrideSchema }),
    ProductController.setBranchOverride,
  );

/**
 * @openapi
 * /api/v1/restaurant/products/{productId}/variants:
 *   get: { tags: [Catalog/Variants], security: [{ bearerAuth: [] }], summary: List a product's variants, responses: { 200: { description: Variants } } }
 *   post: { tags: [Catalog/Variants], security: [{ bearerAuth: [] }], summary: Add a variant to a product, responses: { 201: { description: Created } } }
 */
router
  .route('/:productId/variants')
  .get(validate({ params: productIdParamSchema }), VariantController.list)
  .post(validate({ params: productIdParamSchema, body: createVariantSchema }), VariantController.create);

export default router;
