import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { authenticate, requireAuth } from '#platform/auth/index.js';

import { PublicScanController } from '../controllers/public-scan.controller.js';
import { PublicSessionController } from '../controllers/public-session.controller.js';
import { resolveGuest } from '../middleware/guest-auth.middleware.js';
import { scanRateLimit } from '../middleware/scan-rate-limit.middleware.js';
import { sessionIdParamSchema } from '../validators/common.validators.js';
import {
  endSessionSchema,
  linkSessionSchema,
  openSessionSchema,
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
// `authenticate` is OPTIONAL: if a signed-in customer sends their account token,
// the session captures their customerUserId (so orders, loyalty AND coupon
// audience/per-customer targeting attribute to the account); a pure guest stays
// anonymous. A guest token in the header simply fails the access check → anon.
publicQrRouter.post('/scan', authenticate, scanRateLimit(), validate({ body: scanSchema }), PublicScanController.scan);

/**
 * Public session router (mounted at /api/v1/public/session). Optional guest
 * token is cross-checked against the session when present.
 *
 * @openapi
 * /api/v1/public/session/open:
 *   post:
 *     tags: [Public/Session]
 *     summary: Open an ordering session by typing a table number (no QR scan)
 *     description: The walk-in path — browse the menu, enter your table number, order. Applies the same checks as a scan (restaurant/branch active, business hours, table orderable) and returns the same guest token.
 *     responses:
 *       201: { description: OrderingSession + guest token }
 *       403: { description: Branch closed / table unavailable }
 *       404: { description: Branch or table not found }
 * /api/v1/public/session/current:
 *   get: { tags: [Public/Session], summary: Resume the caller's session from their guest token, responses: { 200: { description: Session }, 403: { description: No guest session } } }
 * /api/v1/public/session/{sessionId}:
 *   get: { tags: [Public/Session], summary: Get a guest session (recovery/poll), responses: { 200: { description: Session } , 404: { description: Not found } } }
 * /api/v1/public/session/recover:
 *   post: { tags: [Public/Session], summary: Recover a session after refresh / new device, responses: { 200: { description: Session + fresh guest token } } }
 * /api/v1/public/session/end:
 *   post: { tags: [Public/Session], summary: End the guest ordering session, responses: { 200: { description: Ended session } } }
 */
export const publicSessionRouter = Router();
// Optional account auth (see scan router) THEN optional guest resolution — so a
// signed-in customer who opens a table session is captured on it.
publicSessionRouter.use(authenticate);
publicSessionRouter.use(resolveGuest);
publicSessionRouter.post('/open', scanRateLimit(), validate({ body: openSessionSchema }), PublicSessionController.open);
// Static paths BEFORE the :sessionId wildcard so they're never swallowed.
publicSessionRouter.get('/current', PublicSessionController.current);
// Guest → account conversion: account access token in the header, guest token
// in the body as proof of session ownership.
publicSessionRouter.post('/link', requireAuth, validate({ body: linkSessionSchema }), PublicSessionController.link);
publicSessionRouter.post('/recover', validate({ body: recoverSchema }), PublicSessionController.recover);
publicSessionRouter.post('/end', validate({ body: endSessionSchema }), PublicSessionController.end);
publicSessionRouter.get('/:sessionId', validate({ params: sessionIdParamSchema }), PublicSessionController.get);
