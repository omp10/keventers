import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth, requireRole } from '#platform/auth/index.js';

import { ORG_ROLES } from '../constants/organization.constants.js';
import { MediaController } from '../controllers/admin-content.controller.js';
import { BranchController } from '../controllers/branch.controller.js';
import { RestaurantController } from '../controllers/restaurant.controller.js';
import { StaffController } from '../controllers/staff.controller.js';
import { singleMediaUpload } from '../middleware/media-upload.middleware.js';
import { resolveTenant, requireTenant } from '../middleware/tenant.middleware.js';
import { idParamSchema, listQuerySchema } from '../validators/common.validators.js';
import {
  createBranchSchema,
  updateBranchSchema,
  updateBusinessHoursSchema,
} from '../validators/branch.validators.js';
import {
  onboardingStepSchema,
  updateRestaurantProfileSchema,
  updateRestaurantSettingsSchema,
} from '../validators/restaurant.validators.js';
import { inviteStaffSchema, listStaffQuerySchema } from '../validators/staff.validators.js';

const router = Router();

// GET /restaurant/context — ANY authenticated staff member (chef, waiter,
// manager, admin) needs their socket rooms for live order events + sound, so
// this sits BEFORE the manager-only gate below, guarded only by auth + tenant.
router.get('/context', requireAuth, resolveTenant, requireTenant, RestaurantController.getContext);

// Everything else: Organization Admin or Restaurant Manager, tenant-scoped.
router.use(
  requireAuth,
  resolveTenant,
  requireTenant,
  requireRole(ORG_ROLES.ORGANIZATION_ADMIN, ORG_ROLES.RESTAURANT_MANAGER),
);

/**
 * Image upload for restaurant-owned content (catalog media, branding). Files go
 * to the Storage Platform server-side — no provider keys ever reach the client.
 *
 * @openapi
 * /api/v1/restaurant/media/upload:
 *   post: { tags: [Restaurant], security: [{ bearerAuth: [] }], summary: Upload an image (multipart `file`), responses: { 201: { description: Uploaded URL + key } } }
 */
router.post('/media/upload', singleMediaUpload, MediaController.upload);

/**
 * @openapi
 * /api/v1/restaurant/profile:
 *   get: { tags: [Restaurant], security: [{ bearerAuth: [] }], summary: Get restaurant profile, responses: { 200: { description: Restaurant } } }
 *   patch: { tags: [Restaurant], security: [{ bearerAuth: [] }], summary: Update restaurant profile, responses: { 200: { description: Updated } } }
 */
router
  .route('/profile')
  .get(RestaurantController.getProfile)
  .patch(validate({ body: updateRestaurantProfileSchema }), RestaurantController.updateProfile);

/**
 * @openapi
 * /api/v1/restaurant/settings:
 *   get: { tags: [Restaurant], security: [{ bearerAuth: [] }], summary: Get restaurant settings, responses: { 200: { description: Settings } } }
 *   patch: { tags: [Restaurant], security: [{ bearerAuth: [] }], summary: Update restaurant settings (partial merge), responses: { 200: { description: Updated } } }
 */
router
  .route('/settings')
  .get(RestaurantController.getSettings)
  .patch(validate({ body: updateRestaurantSettingsSchema }), RestaurantController.updateSettings);

/**
 * @openapi
 * /api/v1/restaurant/onboarding:
 *   get: { tags: [Restaurant/Onboarding], security: [{ bearerAuth: [] }], summary: Get first-login wizard state, responses: { 200: { description: Wizard state } } }
 */
router.get('/onboarding', RestaurantController.getWizard);
router.post('/onboarding/start', RestaurantController.startWizard);
/**
 * @openapi
 * /api/v1/restaurant/onboarding/step:
 *   post: { tags: [Restaurant/Onboarding], security: [{ bearerAuth: [] }], summary: Submit a wizard step, responses: { 200: { description: Updated wizard state } } }
 * /api/v1/restaurant/onboarding/complete:
 *   post: { tags: [Restaurant/Onboarding], security: [{ bearerAuth: [] }], summary: Complete onboarding → restaurant ACTIVE, responses: { 200: { description: Restaurant activated }, 422: { description: Steps incomplete } } }
 */
router.post('/onboarding/step', validate({ body: onboardingStepSchema }), RestaurantController.submitStep);
router.post('/onboarding/complete', RestaurantController.completeWizard);

/**
 * @openapi
 * /api/v1/restaurant/branches:
 *   get: { tags: [Restaurant/Branches], security: [{ bearerAuth: [] }], summary: List branches, responses: { 200: { description: Paginated branches } } }
 *   post: { tags: [Restaurant/Branches], security: [{ bearerAuth: [] }], summary: Create a branch, responses: { 201: { description: Created } } }
 */
router
  .route('/branches')
  .get(validate({ query: listQuerySchema }), BranchController.list)
  .post(validate({ body: createBranchSchema }), BranchController.create);

/**
 * @openapi
 * /api/v1/restaurant/branches/{id}:
 *   get: { tags: [Restaurant/Branches], security: [{ bearerAuth: [] }], summary: Get a branch, responses: { 200: { description: Branch } } }
 *   patch: { tags: [Restaurant/Branches], security: [{ bearerAuth: [] }], summary: Update a branch, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Restaurant/Branches], security: [{ bearerAuth: [] }], summary: Delete a branch, responses: { 200: { description: Deleted } } }
 */
router
  .route('/branches/:id')
  .get(validate({ params: idParamSchema }), BranchController.getById)
  .patch(validate({ params: idParamSchema, body: updateBranchSchema }), BranchController.update)
  .delete(validate({ params: idParamSchema }), BranchController.remove);

/**
 * @openapi
 * /api/v1/restaurant/branches/{id}/business-hours:
 *   patch: { tags: [Restaurant/Branches], security: [{ bearerAuth: [] }], summary: Update a branch's business hours, responses: { 200: { description: Updated } } }
 */
router.patch(
  '/branches/:id/business-hours',
  validate({ params: idParamSchema, body: updateBusinessHoursSchema }),
  BranchController.updateBusinessHours,
);

/**
 * @openapi
 * /api/v1/restaurant/staff:
 *   get: { tags: [Restaurant/Staff], security: [{ bearerAuth: [] }], summary: List restaurant staff (memberships), responses: { 200: { description: Paginated staff } } }
 *   post: { tags: [Restaurant/Staff], security: [{ bearerAuth: [] }], summary: Invite a staff member, responses: { 201: { description: Invited } } }
 */
router
  .route('/staff')
  .get(validate({ query: listStaffQuerySchema }), StaffController.list)
  .post(validate({ body: inviteStaffSchema }), StaffController.invite);

router.delete('/staff/:id', validate({ params: idParamSchema }), StaffController.remove);

export default router;
