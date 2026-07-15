import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { QrController } from '../controllers/qr.controller.js';
import { idParamSchema, tableIdParamSchema } from '../validators/common.validators.js';
import { generateQrSchema } from '../validators/qr.validators.js';

import { managementGuards } from './_guards.js';

const router = Router();

router.use(...managementGuards);

/**
 * @openapi
 * /api/v1/restaurant/qr:
 *   post: { tags: [QR], security: [{ bearerAuth: [] }], summary: Generate a new active QR for a table, responses: { 201: { description: QR (code + scanUrl + image) } } }
 */
router.post('/', validate({ body: generateQrSchema }), QrController.generate);

/**
 * @openapi
 * /api/v1/restaurant/qr/table/{tableId}:
 *   get: { tags: [QR], security: [{ bearerAuth: [] }], summary: List a table's QR codes, responses: { 200: { description: QR codes } } }
 */
router.get('/table/:tableId', validate({ params: tableIdParamSchema }), QrController.listByTable);

/**
 * @openapi
 * /api/v1/restaurant/qr/{id}:
 *   get: { tags: [QR], security: [{ bearerAuth: [] }], summary: Get a QR code, responses: { 200: { description: QR } } }
 *   delete: { tags: [QR], security: [{ bearerAuth: [] }], summary: Delete a QR code, responses: { 200: { description: Deleted } } }
 * /api/v1/restaurant/qr/{id}/regenerate:
 *   post: { tags: [QR], security: [{ bearerAuth: [] }], summary: Regenerate (mint a new token — old codes stop working), responses: { 200: { description: Regenerated } } }
 * /api/v1/restaurant/qr/{id}/rotate:
 *   post: { tags: [QR], security: [{ bearerAuth: [] }], summary: Rotate the signing secret (invalidate old printed codes), responses: { 200: { description: Rotated } } }
 * /api/v1/restaurant/qr/{id}/enable:
 *   post: { tags: [QR], security: [{ bearerAuth: [] }], summary: Enable (activate) a QR code, responses: { 200: { description: Enabled } } }
 * /api/v1/restaurant/qr/{id}/disable:
 *   post: { tags: [QR], security: [{ bearerAuth: [] }], summary: Disable (deactivate) a QR code, responses: { 200: { description: Disabled } } }
 */
router.get('/:id', validate({ params: idParamSchema }), QrController.getById);
router.delete('/:id', validate({ params: idParamSchema }), QrController.remove);
router.post('/:id/regenerate', validate({ params: idParamSchema }), QrController.regenerate);
router.post('/:id/rotate', validate({ params: idParamSchema }), QrController.rotate);
router.post('/:id/enable', validate({ params: idParamSchema }), QrController.enable);
router.post('/:id/disable', validate({ params: idParamSchema }), QrController.disable);

export default router;
