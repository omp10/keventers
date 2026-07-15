import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth, requireRole } from '#platform/auth/index.js';

import { ORG_ROLES } from '../constants/organization.constants.js';
import { AdminOrganizationController } from '../controllers/admin-organization.controller.js';
import { resolveTenant } from '../middleware/tenant.middleware.js';
import { idParamSchema } from '../validators/common.validators.js';
import {
  createOrganizationSchema,
  listOrganizationsQuerySchema,
  suspendOrganizationSchema,
  updateOrganizationSchema,
  updateSubscriptionSchema,
} from '../validators/organization.validators.js';

const router = Router();

router.use(requireAuth, requireRole(ORG_ROLES.SUPER_ADMIN), resolveTenant);

/**
 * @openapi
 * /api/v1/admin/organizations:
 *   get:
 *     tags: [Organizations/Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: List organizations (pagination/filter/search)
 *     responses: { 200: { description: Paginated organizations } }
 *   post:
 *     tags: [Organizations/Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create an organization
 *     responses: { 201: { description: Created } }
 */
router
  .route('/')
  .get(validate({ query: listOrganizationsQuerySchema }), AdminOrganizationController.list)
  .post(validate({ body: createOrganizationSchema }), AdminOrganizationController.create);

/**
 * @openapi
 * /api/v1/admin/organizations/{id}:
 *   get: { tags: [Organizations/Admin], security: [{ bearerAuth: [] }], summary: Get organization, responses: { 200: { description: Organization } } }
 *   patch: { tags: [Organizations/Admin], security: [{ bearerAuth: [] }], summary: Update organization, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Organizations/Admin], security: [{ bearerAuth: [] }], summary: Soft-delete organization, responses: { 200: { description: Deleted } } }
 */
router
  .route('/:id')
  .get(validate({ params: idParamSchema }), AdminOrganizationController.getById)
  .patch(validate({ params: idParamSchema, body: updateOrganizationSchema }), AdminOrganizationController.update)
  .delete(validate({ params: idParamSchema }), AdminOrganizationController.remove);

/**
 * @openapi
 * /api/v1/admin/organizations/{id}/suspend:
 *   post: { tags: [Organizations/Admin], security: [{ bearerAuth: [] }], summary: Suspend organization, responses: { 200: { description: Suspended } } }
 * /api/v1/admin/organizations/{id}/activate:
 *   post: { tags: [Organizations/Admin], security: [{ bearerAuth: [] }], summary: Activate organization, responses: { 200: { description: Activated } } }
 */
router.post(
  '/:id/suspend',
  validate({ params: idParamSchema, body: suspendOrganizationSchema }),
  AdminOrganizationController.suspend,
);
router.post('/:id/activate', validate({ params: idParamSchema }), AdminOrganizationController.activate);

/**
 * @openapi
 * /api/v1/admin/organizations/{id}/subscription:
 *   get: { tags: [Organizations/Admin], security: [{ bearerAuth: [] }], summary: Get subscription, responses: { 200: { description: Subscription } } }
 *   patch: { tags: [Organizations/Admin], security: [{ bearerAuth: [] }], summary: Update subscription lifecycle, responses: { 200: { description: Updated } } }
 */
router
  .route('/:id/subscription')
  .get(validate({ params: idParamSchema }), AdminOrganizationController.getSubscription)
  .patch(
    validate({ params: idParamSchema, body: updateSubscriptionSchema }),
    AdminOrganizationController.updateSubscription,
  );

export default router;
