import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth, requireRole } from '#platform/auth/index.js';

import { ORG_ROLES } from '../constants/organization.constants.js';
import { AdminOnboardingController } from '../controllers/admin-onboarding.controller.js';
import { resolveTenant } from '../middleware/tenant.middleware.js';
import { idParamSchema } from '../validators/common.validators.js';
import {
  approveApplicationSchema,
  listApplicationsQuerySchema,
  rejectApplicationSchema,
  requestInformationSchema,
  updateOnboardingFormConfigSchema,
} from '../validators/onboarding.validators.js';

const router = Router();

// Platform Super Admin only.
router.use(requireAuth, requireRole(ORG_ROLES.SUPER_ADMIN), resolveTenant);

router.get('/form-config', AdminOnboardingController.getFormConfig);
router.put('/form-config', validate({ body: updateOnboardingFormConfigSchema }), AdminOnboardingController.updateFormConfig);

/**
 * @openapi
 * /api/v1/admin/onboarding/applications:
 *   get:
 *     tags: [Onboarding/Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: List onboarding applications (pagination/filter/search)
 *     responses: { 200: { description: Paginated applications } }
 */
router.get('/applications', validate({ query: listApplicationsQuerySchema }), AdminOnboardingController.list);

/**
 * @openapi
 * /api/v1/admin/onboarding/applications/{id}:
 *   get:
 *     tags: [Onboarding/Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: View an application (incl. uploaded documents)
 *     responses: { 200: { description: Application }, 404: { description: Not found } }
 */
router.get('/applications/:id', validate({ params: idParamSchema }), AdminOnboardingController.getById);

/**
 * @openapi
 * /api/v1/admin/onboarding/{id}/approve:
 *   post:
 *     tags: [Onboarding/Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Approve → provision organization + restaurant + branch + owner
 *     responses: { 201: { description: Provisioned }, 409: { description: Already processed } }
 */
router.post(
  '/:id/approve',
  validate({ params: idParamSchema, body: approveApplicationSchema }),
  AdminOnboardingController.approve,
);

/**
 * @openapi
 * /api/v1/admin/onboarding/{id}/reject:
 *   post:
 *     tags: [Onboarding/Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Reject an application
 *     responses: { 200: { description: Rejected } }
 */
router.post(
  '/:id/reject',
  validate({ params: idParamSchema, body: rejectApplicationSchema }),
  AdminOnboardingController.reject,
);

/**
 * @openapi
 * /api/v1/admin/onboarding/{id}/request-information:
 *   post:
 *     tags: [Onboarding/Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Request additional information/documents
 *     responses: { 200: { description: Information requested } }
 */
router.post(
  '/:id/request-information',
  validate({ params: idParamSchema, body: requestInformationSchema }),
  AdminOnboardingController.requestInformation,
);

export default router;
