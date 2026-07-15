import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { ConfigController } from '../controllers/config.controller.js';
import { RestaurantPaymentController } from '../controllers/restaurant-payment.controller.js';
import {
  createConfigSchema,
  idParamSchema,
  listQuerySchema,
  manualPaymentSchema,
  refundRequestSchema,
  updateConfigSchema,
} from '../validators/payment.validators.js';

import { managementGuards } from './_guards.js';

/** /api/v1/restaurant/payments */
export const paymentsRouter = Router();
paymentsRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/payments:
 *   get: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: List payments (?restaurantId=&status=&provider=), responses: { 200: { description: Payments } } }
 * /api/v1/restaurant/payments/manual:
 *   post: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: Record a manual/cash tender (multi-payment), responses: { 201: { description: Payment } } }
 * /api/v1/restaurant/payments/{id}:
 *   get: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: Get a payment, responses: { 200: { description: Payment } } }
 */
paymentsRouter.get('/', validate({ query: listQuerySchema }), RestaurantPaymentController.listPayments);
paymentsRouter.post('/manual', validate({ body: manualPaymentSchema }), RestaurantPaymentController.recordManualPayment);
paymentsRouter.get('/:id', validate({ params: idParamSchema }), RestaurantPaymentController.getPayment);

/** /api/v1/restaurant/transactions */
export const transactionsRouter = Router();
transactionsRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/transactions:
 *   get: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: List immutable transactions, responses: { 200: { description: Transactions } } }
 */
transactionsRouter.get('/', validate({ query: listQuerySchema }), RestaurantPaymentController.listTransactions);

/** /api/v1/restaurant/refunds */
export const refundsRouter = Router();
refundsRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/refunds:
 *   get: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: List refunds, responses: { 200: { description: Refunds } } }
 *   post: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: Request a refund (full/partial; provider-executed), responses: { 201: { description: Refund } } }
 */
refundsRouter.get('/', validate({ query: listQuerySchema }), RestaurantPaymentController.listRefunds);
refundsRouter.post('/', validate({ body: refundRequestSchema }), RestaurantPaymentController.requestRefund);

/** /api/v1/restaurant/invoices */
export const invoicesRouter = Router();
invoicesRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/invoices:
 *   get: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: List invoices, responses: { 200: { description: Invoices } } }
 * /api/v1/restaurant/invoices/{id}:
 *   get: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: Get an invoice, responses: { 200: { description: Invoice } } }
 */
invoicesRouter.get('/', validate({ query: listQuerySchema }), RestaurantPaymentController.listInvoices);
invoicesRouter.get('/:id', validate({ params: idParamSchema }), RestaurantPaymentController.getInvoice);

/** /api/v1/restaurant/payment-config */
export const configRouter = Router();
configRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/payment-config:
 *   get: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: List provider configs (no secrets), responses: { 200: { description: Configs } } }
 *   post: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: Add a provider config (credentials encrypted at rest), responses: { 201: { description: Created } } }
 * /api/v1/restaurant/payment-config/{id}:
 *   patch: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: Update a provider config, responses: { 200: { description: Updated } } }
 *   delete: { tags: [Restaurant/Payments], security: [{ bearerAuth: [] }], summary: Remove a provider config, responses: { 200: { description: Deleted } } }
 */
configRouter.get('/', ConfigController.list);
configRouter.post('/', validate({ body: createConfigSchema }), ConfigController.create);
configRouter.patch('/:id', validate({ params: idParamSchema, body: updateConfigSchema }), ConfigController.update);
configRouter.delete('/:id', validate({ params: idParamSchema }), ConfigController.remove);
