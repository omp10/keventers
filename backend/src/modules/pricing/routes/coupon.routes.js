import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth, requireRole } from '#platform/auth/index.js';
import { ORG_ROLES, requireTenant, resolveTenant } from '#modules/organization/index.js';

import { CouponController } from '../controllers/coupon.controller.js';
import {
  createCouponSchema,
  idParamSchema,
  listCouponsQuerySchema,
  updateCouponSchema,
} from '../validators/coupon.validators.js';

const router = Router();

router.use(
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER),
);

/**
 * @openapi
 * /api/v1/restaurant/coupons:
 *   get: { tags: [Coupons], security: [{ bearerAuth: [] }], summary: List coupons (?restaurantId=), responses: { 200: { description: Paginated coupons } } }
 *   post: { tags: [Coupons], security: [{ bearerAuth: [] }], summary: Create a coupon (percentage/fixed/free-item/BXGY), responses: { 201: { description: Created } } }
 */
router
  .route('/')
  .get(validate({ query: listCouponsQuerySchema }), CouponController.list)
  .post(validate({ body: createCouponSchema }), CouponController.create);

/**
 * @openapi
 * /api/v1/restaurant/coupons/{id}:
 *   get: { tags: [Coupons], security: [{ bearerAuth: [] }], summary: Get a coupon, responses: { 200: { description: Coupon } } }
 *   patch: { tags: [Coupons], security: [{ bearerAuth: [] }], summary: Update a coupon, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Coupons], security: [{ bearerAuth: [] }], summary: Soft-delete a coupon, responses: { 200: { description: Deleted } } }
 */
router
  .route('/:id')
  .get(validate({ params: idParamSchema }), CouponController.getById)
  .patch(validate({ params: idParamSchema, body: updateCouponSchema }), CouponController.update)
  .delete(validate({ params: idParamSchema }), CouponController.remove);

export default router;
