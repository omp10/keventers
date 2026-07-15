import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth, requirePermission } from '#platform/auth/index.js';

import { IDENTITY_PERMISSIONS } from '../constants/identity.constants.js';
import { UserController } from '../controllers/user.controller.js';
import { idParamSchema } from '../validators/common.validators.js';
import {
  assignPermissionsSchema,
  assignRolesSchema,
  createUserSchema,
  listUsersQuerySchema,
  updateProfileSchema,
  updateUserSchema,
} from '../validators/user.validators.js';

const router = Router();

// All user-administration routes require authentication.
router.use(requireAuth);

/**
 * @openapi
 * /api/v1/identity/users:
 *   get:
 *     tags: [Identity/Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: List users (pagination, filtering, search, sorting)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: sort, schema: { type: string }, description: "e.g. createdAt:desc" }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: type, schema: { type: string } }
 *       - { in: query, name: role, schema: { type: string } }
 *     responses:
 *       200: { description: Paginated users }
 *   post:
 *     tags: [Identity/Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a user
 *     responses:
 *       201: { description: Created }
 *       409: { description: Email/phone already registered }
 */
router
  .route('/')
  .get(
    requirePermission(IDENTITY_PERMISSIONS.USER_READ),
    validate({ query: listUsersQuerySchema }),
    UserController.list,
  )
  .post(
    requirePermission(IDENTITY_PERMISSIONS.USER_CREATE),
    validate({ body: createUserSchema }),
    UserController.create,
  );

/**
 * @openapi
 * /api/v1/identity/users/{id}:
 *   get:
 *     tags: [Identity/Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Get a user by id
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses:
 *       200: { description: User }
 *       404: { description: Not found }
 *   patch:
 *     tags: [Identity/Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update a user
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     tags: [Identity/Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Soft-delete a user
 *     responses:
 *       200: { description: Deleted }
 */
router
  .route('/:id')
  .get(
    requirePermission(IDENTITY_PERMISSIONS.USER_READ),
    validate({ params: idParamSchema }),
    UserController.getById,
  )
  .patch(
    requirePermission(IDENTITY_PERMISSIONS.USER_UPDATE),
    validate({ params: idParamSchema, body: updateUserSchema }),
    UserController.update,
  )
  .delete(
    requirePermission(IDENTITY_PERMISSIONS.USER_DELETE),
    validate({ params: idParamSchema }),
    UserController.remove,
  );

/**
 * @openapi
 * /api/v1/identity/users/{id}/profile:
 *   patch:
 *     tags: [Identity/Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update a user's profile
 *     responses: { 200: { description: Updated } }
 */
router.patch(
  '/:id/profile',
  requirePermission(IDENTITY_PERMISSIONS.USER_UPDATE),
  validate({ params: idParamSchema, body: updateProfileSchema }),
  UserController.updateProfile,
);

/**
 * @openapi
 * /api/v1/identity/users/{id}/disable:
 *   post: { tags: [Identity/Users], security: [{ bearerAuth: [] }], summary: Disable a user, responses: { 200: { description: Disabled } } }
 * /api/v1/identity/users/{id}/enable:
 *   post: { tags: [Identity/Users], security: [{ bearerAuth: [] }], summary: Enable a user, responses: { 200: { description: Enabled } } }
 */
router.post(
  '/:id/disable',
  requirePermission(IDENTITY_PERMISSIONS.USER_DISABLE),
  validate({ params: idParamSchema }),
  UserController.disable,
);
router.post(
  '/:id/enable',
  requirePermission(IDENTITY_PERMISSIONS.USER_DISABLE),
  validate({ params: idParamSchema }),
  UserController.enable,
);

/**
 * @openapi
 * /api/v1/identity/users/{id}/roles:
 *   post: { tags: [Identity/Users], security: [{ bearerAuth: [] }], summary: Assign roles, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Identity/Users], security: [{ bearerAuth: [] }], summary: Remove roles, responses: { 200: { description: Updated } } }
 */
router
  .route('/:id/roles')
  .post(
    requirePermission(IDENTITY_PERMISSIONS.USER_ASSIGN_ROLES),
    validate({ params: idParamSchema, body: assignRolesSchema }),
    UserController.assignRoles,
  )
  .delete(
    requirePermission(IDENTITY_PERMISSIONS.USER_ASSIGN_ROLES),
    validate({ params: idParamSchema, body: assignRolesSchema }),
    UserController.removeRoles,
  );

/**
 * @openapi
 * /api/v1/identity/users/{id}/permissions:
 *   post: { tags: [Identity/Users], security: [{ bearerAuth: [] }], summary: Assign direct permissions, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Identity/Users], security: [{ bearerAuth: [] }], summary: Remove direct permissions, responses: { 200: { description: Updated } } }
 */
router
  .route('/:id/permissions')
  .post(
    requirePermission(IDENTITY_PERMISSIONS.USER_ASSIGN_PERMISSIONS),
    validate({ params: idParamSchema, body: assignPermissionsSchema }),
    UserController.assignPermissions,
  )
  .delete(
    requirePermission(IDENTITY_PERMISSIONS.USER_ASSIGN_PERMISSIONS),
    validate({ params: idParamSchema, body: assignPermissionsSchema }),
    UserController.removePermissions,
  );

export default router;
