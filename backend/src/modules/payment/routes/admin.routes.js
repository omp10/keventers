import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { AdminPaymentController } from '../controllers/admin-payment.controller.js';
import {
  createSettlementSchema,
  idParamSchema,
  listQuerySchema,
} from '../validators/payment.validators.js';

import { adminGuards } from './_guards.js';

/** /api/v1/admin/payments */
export const adminPaymentsRouter = Router();
adminPaymentsRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/payments:
 *   get: { tags: [Admin/Payments], security: [{ bearerAuth: [] }], summary: Inspect payments (?restaurantId=), responses: { 200: { description: Payments } } }
 */
adminPaymentsRouter.get('/', validate({ query: listQuerySchema }), AdminPaymentController.listPayments);

/** /api/v1/admin/transactions */
export const adminTransactionsRouter = Router();
adminTransactionsRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/transactions:
 *   get: { tags: [Admin/Payments], security: [{ bearerAuth: [] }], summary: Inspect transactions (?restaurantId=), responses: { 200: { description: Transactions } } }
 */
adminTransactionsRouter.get('/', validate({ query: listQuerySchema }), AdminPaymentController.listTransactions);

/** /api/v1/admin/settlements */
export const adminSettlementsRouter = Router();
adminSettlementsRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/settlements:
 *   get: { tags: [Admin/Payments], security: [{ bearerAuth: [] }], summary: List settlements (?restaurantId=), responses: { 200: { description: Settlements } } }
 *   post: { tags: [Admin/Payments], security: [{ bearerAuth: [] }], summary: Create a settlement for a period (abstraction), responses: { 201: { description: Settlement } } }
 * /api/v1/admin/settlements/{id}/complete:
 *   post: { tags: [Admin/Payments], security: [{ bearerAuth: [] }], summary: Mark a settlement completed, responses: { 200: { description: Completed } } }
 */
adminSettlementsRouter.get('/', validate({ query: listQuerySchema }), AdminPaymentController.listSettlements);
adminSettlementsRouter.post('/', validate({ body: createSettlementSchema }), AdminPaymentController.createSettlement);
adminSettlementsRouter.post('/:id/complete', validate({ params: idParamSchema }), AdminPaymentController.completeSettlement);
