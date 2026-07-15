import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth, requirePermission } from '#platform/auth/index.js';

import { IDENTITY_PERMISSIONS } from '../constants/identity.constants.js';
import { StaffController } from '../controllers/staff.controller.js';
import { idParamSchema, listQuerySchema } from '../validators/common.validators.js';
import { createStaffSchema, updateStaffSchema } from '../validators/staff.validators.js';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/v1/identity/staff:
 *   get: { tags: [Identity/Staff], security: [{ bearerAuth: [] }], summary: List staff, responses: { 200: { description: Paginated staff } } }
 *   post: { tags: [Identity/Staff], security: [{ bearerAuth: [] }], summary: Create a staff member (user + staff record), responses: { 201: { description: Created } } }
 */
router
  .route('/')
  .get(
    requirePermission(IDENTITY_PERMISSIONS.STAFF_READ),
    validate({ query: listQuerySchema }),
    StaffController.list,
  )
  .post(
    requirePermission(IDENTITY_PERMISSIONS.STAFF_MANAGE),
    validate({ body: createStaffSchema }),
    StaffController.create,
  );

/**
 * @openapi
 * /api/v1/identity/staff/{id}:
 *   get: { tags: [Identity/Staff], security: [{ bearerAuth: [] }], summary: Get staff by id, responses: { 200: { description: Staff } } }
 *   patch: { tags: [Identity/Staff], security: [{ bearerAuth: [] }], summary: Update staff, responses: { 200: { description: Updated } } }
 */
router
  .route('/:id')
  .get(
    requirePermission(IDENTITY_PERMISSIONS.STAFF_READ),
    validate({ params: idParamSchema }),
    StaffController.getById,
  )
  .patch(
    requirePermission(IDENTITY_PERMISSIONS.STAFF_MANAGE),
    validate({ params: idParamSchema, body: updateStaffSchema }),
    StaffController.update,
  );

export default router;
