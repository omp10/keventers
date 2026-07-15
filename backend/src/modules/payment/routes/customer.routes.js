import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { CustomerPaymentController } from '../controllers/customer-payment.controller.js';
import {
  confirmSchema,
  createIntentSchema,
  idParamSchema,
} from '../validators/payment.validators.js';

import { customerGuards } from './_guards.js';

const router = Router();

router.use(...customerGuards);

/**
 * @openapi
 * /api/v1/payments/create-intent:
 *   post:
 *     tags: [Payments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a payment intent for an order (multi-payment aware)
 *     description: Amount comes from the order's immutable Pricing-Engine snapshot; omit for the full balance, provide for a partial tender. Idempotency-Key supported.
 *     responses: { 201: { description: Intent + checkout payload }, 400: { description: Not payable / amount exceeds balance } }
 * /api/v1/payments/confirm:
 *   post: { tags: [Payments], security: [{ bearerAuth: [] }], summary: Confirm a payment (verifies the provider signature), responses: { 200: { description: Payment }, 403: { description: Signature invalid } } }
 * /api/v1/payments/{id}:
 *   get: { tags: [Payments], security: [{ bearerAuth: [] }], summary: Get one of the session's payments, responses: { 200: { description: Payment } } }
 */
router.post('/create-intent', validate({ body: createIntentSchema }), CustomerPaymentController.createIntent);
router.post('/confirm', validate({ body: confirmSchema }), CustomerPaymentController.confirm);
router.get('/:id', validate({ params: idParamSchema }), CustomerPaymentController.getById);

export default router;
