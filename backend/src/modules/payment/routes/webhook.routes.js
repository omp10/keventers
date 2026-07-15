import { Router } from 'express';

import { WebhookController } from '../controllers/webhook.controller.js';

/**
 * Provider webhook endpoints. UNAUTHENTICATED by design — security is the
 * cryptographic signature verification + replay/idempotency guards inside the
 * webhook service (using the exact raw body captured by the JSON parser).
 *
 * @openapi
 * /api/v1/webhooks/razorpay:
 *   post: { tags: [Webhooks], summary: Razorpay webhook (signature-verified), responses: { 200: { description: Ack }, 403: { description: Invalid signature } } }
 * /api/v1/webhooks/phonepe:
 *   post: { tags: [Webhooks], summary: PhonePe webhook (checksum-verified), responses: { 200: { description: Ack }, 403: { description: Invalid signature } } }
 */
const router = Router();

router.post('/razorpay', WebhookController.razorpay);
router.post('/phonepe', WebhookController.phonepe);

export default router;
