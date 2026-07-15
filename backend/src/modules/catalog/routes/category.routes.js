import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { CategoryController } from '../controllers/category.controller.js';
import {
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from '../validators/category.validators.js';
import { idParamSchema } from '../validators/common.validators.js';

import { restaurantGuards } from './_guards.js';

const router = Router();

router.use(...restaurantGuards);

/**
 * @openapi
 * /api/v1/restaurant/categories:
 *   get: { tags: [Catalog/Categories], security: [{ bearerAuth: [] }], summary: List categories (main + subcategories), responses: { 200: { description: Paginated categories } } }
 *   post: { tags: [Catalog/Categories], security: [{ bearerAuth: [] }], summary: Create a category (parentId null = main, set = subcategory; max depth 2), responses: { 201: { description: Created } } }
 */
router
  .route('/')
  .get(validate({ query: listCategoriesQuerySchema }), CategoryController.list)
  .post(validate({ body: createCategorySchema }), CategoryController.create);

/**
 * @openapi
 * /api/v1/restaurant/categories/tree:
 *   get: { tags: [Catalog/Categories], security: [{ bearerAuth: [] }], summary: Full main→subcategory tree, responses: { 200: { description: Category tree } } }
 */
router.get('/tree', CategoryController.tree);

/**
 * @openapi
 * /api/v1/restaurant/categories/{id}:
 *   get: { tags: [Catalog/Categories], security: [{ bearerAuth: [] }], summary: Get a category, responses: { 200: { description: Category } } }
 *   patch: { tags: [Catalog/Categories], security: [{ bearerAuth: [] }], summary: Update a category, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Catalog/Categories], security: [{ bearerAuth: [] }], summary: Soft-delete a category (must have no children/products), responses: { 200: { description: Deleted }, 409: { description: Has children or products } } }
 */
router
  .route('/:id')
  .get(validate({ params: idParamSchema }), CategoryController.getById)
  .patch(validate({ params: idParamSchema, body: updateCategorySchema }), CategoryController.update)
  .delete(validate({ params: idParamSchema }), CategoryController.remove);

export default router;
