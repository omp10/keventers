import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { AdminCustomerController } from '../controllers/admin-customer.controller.js';
import {
  customerListQuerySchema,
  idParamSchema,
  rewardListQuerySchema,
} from '../validators/customer.validators.js';

import { adminGuards } from './_guards.js';

/**
 * Platform admin routers (Super Admin). Cross-tenant customer/loyalty/reward
 * visibility + GDPR erasure. A `restaurantId` query narrows to one restaurant.
 */
export const adminCustomersRouter = Router();
adminCustomersRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/customers:
 *   get: { tags: [Customer - Admin], security: [{ bearerAuth: [] }], summary: List customers (platform), responses: { 200: { description: Customers } } }
 * /api/v1/admin/customers/{id}:
 *   get: { tags: [Customer - Admin], security: [{ bearerAuth: [] }], summary: Get a customer, responses: { 200: { description: Customer } } }
 *   delete: { tags: [Customer - Admin], security: [{ bearerAuth: [] }], summary: GDPR-erase a customer (PII scrubbed, ledger retained), responses: { 200: { description: Erased } } }
 */
adminCustomersRouter.get('/', validate({ query: customerListQuerySchema }), AdminCustomerController.listCustomers);
adminCustomersRouter.get('/:id', validate({ params: idParamSchema }), AdminCustomerController.getCustomer);
adminCustomersRouter.delete('/:id', validate({ params: idParamSchema }), AdminCustomerController.eraseCustomer);

export const adminLoyaltyRouter = Router();
adminLoyaltyRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/loyalty:
 *   get: { tags: [Customer - Admin], security: [{ bearerAuth: [] }], summary: Loyalty overview (platform), responses: { 200: { description: Loyalty } } }
 */
adminLoyaltyRouter.get('/', validate({ query: customerListQuerySchema }), AdminCustomerController.listLoyalty);

export const adminRewardsRouter = Router();
adminRewardsRouter.use(...adminGuards);
/**
 * @openapi
 * /api/v1/admin/rewards:
 *   get: { tags: [Customer - Admin], security: [{ bearerAuth: [] }], summary: Reward catalog (platform), responses: { 200: { description: Rewards } } }
 */
adminRewardsRouter.get('/', validate({ query: rewardListQuerySchema }), AdminCustomerController.listRewards);

export default { adminCustomersRouter, adminLoyaltyRouter, adminRewardsRouter };
