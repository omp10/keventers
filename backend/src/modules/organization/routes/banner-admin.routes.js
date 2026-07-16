import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth, requireRole } from '#platform/auth/index.js';

import { ORG_ROLES } from '../constants/organization.constants.js';
import { BannerAdminController } from '../controllers/banner-admin.controller.js';
import { idParamSchema } from '../validators/common.validators.js';
import {
  createBannerSchema,
  listBannersQuerySchema,
  updateBannerSchema,
} from '../validators/discovery.validators.js';

/**
 * Admin banner curation (mounted at /api/v1/admin/banners). Super-admin only —
 * banners are platform-wide customer-facing content.
 *
 * @openapi
 * /api/v1/admin/banners:
 *   get: { tags: [Banners/Admin], security: [{ bearerAuth: [] }], summary: List banners (any status, paginated), responses: { 200: { description: Paginated banners } } }
 *   post: { tags: [Banners/Admin], security: [{ bearerAuth: [] }], summary: Create a banner, responses: { 201: { description: Created } } }
 * /api/v1/admin/banners/{id}:
 *   patch: { tags: [Banners/Admin], security: [{ bearerAuth: [] }], summary: Update a banner, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Banners/Admin], security: [{ bearerAuth: [] }], summary: Delete a banner, responses: { 200: { description: Deleted } } }
 */
const router = Router();

router.use(requireAuth, requireRole(ORG_ROLES.SUPER_ADMIN));

router
  .route('/')
  .get(validate({ query: listBannersQuerySchema }), BannerAdminController.list)
  .post(validate({ body: createBannerSchema }), BannerAdminController.create);

router
  .route('/:id')
  .patch(validate({ params: idParamSchema, body: updateBannerSchema }), BannerAdminController.update)
  .delete(validate({ params: idParamSchema }), BannerAdminController.remove);

export default router;
