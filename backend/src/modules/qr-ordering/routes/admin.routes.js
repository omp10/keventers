import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { QrController } from '../controllers/qr.controller.js';
import { SessionController } from '../controllers/session.controller.js';
import { TableController } from '../controllers/table.controller.js';
import { idParamSchema, listQuerySchema, tableIdParamSchema } from '../validators/common.validators.js';
import { listSessionsQuerySchema, releaseTableSchema } from '../validators/session.validators.js';

import { adminGuards } from './_guards.js';

/**
 * Platform Super-Admin inspection + troubleshooting across ANY restaurant/branch
 * (an explicit ?restaurantId=&branchId= is required — a super admin has no
 * primary tenant). Tenant isolation still applies when the scope is resolved.
 */

// --- /api/v1/admin/tables ---
export const adminTablesRouter = Router();
adminTablesRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/tables:
 *   get: { tags: [Admin/Tables], security: [{ bearerAuth: [] }], summary: Inspect tables (?restaurantId=&branchId=), responses: { 200: { description: Tables } } }
 * /api/v1/admin/tables/{id}:
 *   get: { tags: [Admin/Tables], security: [{ bearerAuth: [] }], summary: Inspect a table, responses: { 200: { description: Table } } }
 * /api/v1/admin/tables/{id}/status:
 *   patch: { tags: [Admin/Tables], security: [{ bearerAuth: [] }], summary: Override a table's status, responses: { 200: { description: Updated } } }
 */
adminTablesRouter.get('/', validate({ query: listQuerySchema }), TableController.list);
adminTablesRouter.get('/:id', validate({ params: idParamSchema }), TableController.getById);

// --- /api/v1/admin/qr ---
export const adminQrRouter = Router();
adminQrRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/qr/table/{tableId}:
 *   get: { tags: [Admin/QR], security: [{ bearerAuth: [] }], summary: Inspect a table's QR codes, responses: { 200: { description: QR codes } } }
 * /api/v1/admin/qr/{id}:
 *   get: { tags: [Admin/QR], security: [{ bearerAuth: [] }], summary: Inspect a QR code, responses: { 200: { description: QR } } }
 * /api/v1/admin/qr/{id}/regenerate:
 *   post: { tags: [Admin/QR], security: [{ bearerAuth: [] }], summary: Regenerate a QR (troubleshooting), responses: { 200: { description: Regenerated } } }
 * /api/v1/admin/qr/{id}/rotate:
 *   post: { tags: [Admin/QR], security: [{ bearerAuth: [] }], summary: Rotate a QR secret, responses: { 200: { description: Rotated } } }
 * /api/v1/admin/qr/{id}/disable:
 *   post: { tags: [Admin/QR], security: [{ bearerAuth: [] }], summary: Disable a QR, responses: { 200: { description: Disabled } } }
 */
adminQrRouter.get('/table/:tableId', validate({ params: tableIdParamSchema }), QrController.listByTable);
adminQrRouter.get('/:id', validate({ params: idParamSchema }), QrController.getById);
adminQrRouter.post('/:id/regenerate', validate({ params: idParamSchema }), QrController.regenerate);
adminQrRouter.post('/:id/rotate', validate({ params: idParamSchema }), QrController.rotate);
adminQrRouter.post('/:id/disable', validate({ params: idParamSchema }), QrController.disable);

// --- /api/v1/admin/sessions ---
export const adminSessionsRouter = Router();
adminSessionsRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/sessions:
 *   get: { tags: [Admin/Sessions], security: [{ bearerAuth: [] }], summary: Inspect guest sessions (?restaurantId=&branchId=), responses: { 200: { description: Sessions } } }
 * /api/v1/admin/sessions/{id}:
 *   get: { tags: [Admin/Sessions], security: [{ bearerAuth: [] }], summary: Inspect a session, responses: { 200: { description: Session } } }
 * /api/v1/admin/sessions/{id}/terminate:
 *   post: { tags: [Admin/Sessions], security: [{ bearerAuth: [] }], summary: Terminate a session, responses: { 200: { description: Terminated } } }
 * /api/v1/admin/sessions/release-table:
 *   post: { tags: [Admin/Sessions], security: [{ bearerAuth: [] }], summary: Force-release a table, responses: { 200: { description: Released } } }
 */
adminSessionsRouter.get('/', validate({ query: listSessionsQuerySchema }), SessionController.list);
adminSessionsRouter.post('/release-table', validate({ body: releaseTableSchema }), SessionController.releaseTable);
adminSessionsRouter.get('/:id', validate({ params: idParamSchema }), SessionController.getById);
adminSessionsRouter.post('/:id/terminate', validate({ params: idParamSchema }), SessionController.terminate);
