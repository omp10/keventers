import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth, requirePermission } from '#platform/auth/index.js';

import { IDENTITY_PERMISSIONS } from '../constants/identity.constants.js';
import { PermissionController } from '../controllers/permission.controller.js';
import { idParamSchema, listQuerySchema } from '../validators/common.validators.js';
import {
  createPermissionSchema,
  updatePermissionSchema,
} from '../validators/permission.validators.js';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/v1/identity/permissions:
 *   get: { tags: [Identity/Permissions], security: [{ bearerAuth: [] }], summary: List permissions, responses: { 200: { description: Paginated permissions } } }
 *   post: { tags: [Identity/Permissions], security: [{ bearerAuth: [] }], summary: Create a permission, responses: { 201: { description: Created } } }
 */
router
  .route('/')
  .get(
    requirePermission(IDENTITY_PERMISSIONS.PERMISSION_READ),
    validate({ query: listQuerySchema }),
    PermissionController.list,
  )
  .post(
    requirePermission(IDENTITY_PERMISSIONS.PERMISSION_MANAGE),
    validate({ body: createPermissionSchema }),
    PermissionController.create,
  );

/**
 * @openapi
 * /api/v1/identity/permissions/{id}:
 *   get: { tags: [Identity/Permissions], security: [{ bearerAuth: [] }], summary: Get permission, responses: { 200: { description: Permission } } }
 *   patch: { tags: [Identity/Permissions], security: [{ bearerAuth: [] }], summary: Update permission, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Identity/Permissions], security: [{ bearerAuth: [] }], summary: Delete permission, responses: { 200: { description: Deleted } } }
 */
router
  .route('/:id')
  .get(
    requirePermission(IDENTITY_PERMISSIONS.PERMISSION_READ),
    validate({ params: idParamSchema }),
    PermissionController.getById,
  )
  .patch(
    requirePermission(IDENTITY_PERMISSIONS.PERMISSION_MANAGE),
    validate({ params: idParamSchema, body: updatePermissionSchema }),
    PermissionController.update,
  )
  .delete(
    requirePermission(IDENTITY_PERMISSIONS.PERMISSION_MANAGE),
    validate({ params: idParamSchema }),
    PermissionController.remove,
  );

export default router;
