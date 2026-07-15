import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth, requirePermission } from '#platform/auth/index.js';

import { IDENTITY_PERMISSIONS } from '../constants/identity.constants.js';
import { RoleController } from '../controllers/role.controller.js';
import { idParamSchema, listQuerySchema } from '../validators/common.validators.js';
import {
  createRoleSchema,
  rolePermissionsSchema,
  updateRoleSchema,
} from '../validators/role.validators.js';

const router = Router();
router.use(requireAuth);

/**
 * @openapi
 * /api/v1/identity/roles:
 *   get:
 *     tags: [Identity/Roles]
 *     security: [{ bearerAuth: [] }]
 *     summary: List roles
 *     responses: { 200: { description: Paginated roles } }
 *   post:
 *     tags: [Identity/Roles]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a role
 *     responses: { 201: { description: Created }, 409: { description: Name taken } }
 */
router
  .route('/')
  .get(
    requirePermission(IDENTITY_PERMISSIONS.ROLE_READ),
    validate({ query: listQuerySchema }),
    RoleController.list,
  )
  .post(
    requirePermission(IDENTITY_PERMISSIONS.ROLE_MANAGE),
    validate({ body: createRoleSchema }),
    RoleController.create,
  );

/**
 * @openapi
 * /api/v1/identity/roles/{id}:
 *   get: { tags: [Identity/Roles], security: [{ bearerAuth: [] }], summary: Get role, responses: { 200: { description: Role } } }
 *   patch: { tags: [Identity/Roles], security: [{ bearerAuth: [] }], summary: Update role, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Identity/Roles], security: [{ bearerAuth: [] }], summary: Delete role, responses: { 200: { description: Deleted } } }
 */
router
  .route('/:id')
  .get(
    requirePermission(IDENTITY_PERMISSIONS.ROLE_READ),
    validate({ params: idParamSchema }),
    RoleController.getById,
  )
  .patch(
    requirePermission(IDENTITY_PERMISSIONS.ROLE_MANAGE),
    validate({ params: idParamSchema, body: updateRoleSchema }),
    RoleController.update,
  )
  .delete(
    requirePermission(IDENTITY_PERMISSIONS.ROLE_MANAGE),
    validate({ params: idParamSchema }),
    RoleController.remove,
  );

/**
 * @openapi
 * /api/v1/identity/roles/{id}/permissions:
 *   post: { tags: [Identity/Roles], security: [{ bearerAuth: [] }], summary: Add permissions to role, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Identity/Roles], security: [{ bearerAuth: [] }], summary: Remove permissions from role, responses: { 200: { description: Updated } } }
 */
router
  .route('/:id/permissions')
  .post(
    requirePermission(IDENTITY_PERMISSIONS.ROLE_MANAGE),
    validate({ params: idParamSchema, body: rolePermissionsSchema }),
    RoleController.addPermissions,
  )
  .delete(
    requirePermission(IDENTITY_PERMISSIONS.ROLE_MANAGE),
    validate({ params: idParamSchema, body: rolePermissionsSchema }),
    RoleController.removePermissions,
  );

export default router;
