import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { PublicScanController } from '../controllers/public-scan.controller.js';
import { PublicSessionController } from '../controllers/public-session.controller.js';
import { resolveGuest } from '../middleware/guest-auth.middleware.js';
import { scanRateLimit } from '../middleware/scan-rate-limit.middleware.js';
import { sessionIdParamSchema } from '../validators/common.validators.js';
import {
  endSessionSchema,
  recoverSchema,
  scanSchema,
} from '../validators/public.validators.js';

/**
 * Public QR scan router (mounted at /api/v1/public/qr). Unauthenticated; the QR
 * token is the credential. Rate-limited per IP.
 *
 * @openapi
 * /api/v1/public/qr/scan:
 *   post:
 *     tags: [Public/QR]
 *     summary: Scan a QR code and create a guest ordering session
 *     description: Validates the QR signature, restaurant/branch/table + business hours, then returns a guest token, session and full restaurant context (no further bootstrap needed).
 *     responses: { 201: { description: Guest session + token + context }, 403: { description: Invalid/expired/tampered QR or closed }, 429: { description: Rate limited } }
 */
export const publicQrRouter = Router();
publicQrRouter.post('/scan', scanRateLimit(), validate({ body: scanSchema }), PublicScanController.scan);

/**
 * Public session router (mounted at /api/v1/public/session). Optional guest
 * token is cross-checked against the session when present.
 *
 * @openapi
 * /api/v1/public/session/{sessionId}:
 *   get: { tags: [Public/Session], summary: Get a guest session (recovery/poll), responses: { 200: { description: Session } , 404: { description: Not found } } }
 * /api/v1/public/session/recover:
 *   post: { tags: [Public/Session], summary: Recover a session after refresh / new device, responses: { 200: { description: Session + fresh guest token } } }
 * /api/v1/public/session/end:
 *   post: { tags: [Public/Session], summary: End the guest ordering session, responses: { 200: { description: Ended session } } }
 */
export const publicSessionRouter = Router();
publicSessionRouter.use(resolveGuest);
publicSessionRouter.post('/recover', validate({ body: recoverSchema }), PublicSessionController.recover);
publicSessionRouter.post('/end', validate({ body: endSessionSchema }), PublicSessionController.end);
publicSessionRouter.get('/:sessionId', validate({ params: sessionIdParamSchema }), PublicSessionController.get);
