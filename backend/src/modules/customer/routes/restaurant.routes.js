import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { RestaurantCustomerController } from '../controllers/restaurant-customer.controller.js';
import {
  adjustPointsSchema,
  createRewardSchema,
  customerListQuerySchema,
  idParamSchema,
  loyaltyLedgerQuerySchema,
  rewardListQuerySchema,
  updateRewardSchema,
} from '../validators/customer.validators.js';

import { managementGuards, requireLoyaltyAdjust, requireRewardManage } from './_guards.js';

/**
 * Restaurant staff routers. Mounted under specific `/restaurant/*` paths so they
 * compose cleanly with the organization module (registered after this module).
 * Sensitive loyalty/reward mutations require a fine-grained permission on top of
 * the management role.
 */
export const customersRouter = Router();
customersRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/customers:
 *   get: { tags: [Customer - Restaurant], security: [{ bearerAuth: [] }], summary: List restaurant customers (CRM), responses: { 200: { description: Customers } } }
 * /api/v1/restaurant/customers/{id}:
 *   get: { tags: [Customer - Restaurant], security: [{ bearerAuth: [] }], summary: Get a customer (profile + loyalty), responses: { 200: { description: Customer } } }
 */
customersRouter.get('/', validate({ query: customerListQuerySchema }), RestaurantCustomerController.listCustomers);
customersRouter.get('/:id', validate({ params: idParamSchema }), RestaurantCustomerController.getCustomer);
customersRouter.get('/:id/ledger', validate({ params: idParamSchema, query: loyaltyLedgerQuerySchema }), RestaurantCustomerController.getCustomerLedger);
customersRouter.patch('/:id/status', validate({ params: idParamSchema }), requireLoyaltyAdjust, RestaurantCustomerController.setCustomerStatus);
customersRouter.post('/:id/loyalty/adjust', validate({ params: idParamSchema, body: adjustPointsSchema }), requireLoyaltyAdjust, RestaurantCustomerController.adjustPoints);

export const loyaltyRouter = Router();
loyaltyRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/loyalty:
 *   get: { tags: [Customer - Restaurant], security: [{ bearerAuth: [] }], summary: Loyalty overview (customers by tier/balance), responses: { 200: { description: Loyalty } } }
 */
loyaltyRouter.get('/', validate({ query: customerListQuerySchema }), RestaurantCustomerController.listLoyalty);

export const rewardsRouter = Router();
rewardsRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/rewards:
 *   get: { tags: [Customer - Restaurant], security: [{ bearerAuth: [] }], summary: List the reward catalog, responses: { 200: { description: Rewards } } }
 *   post: { tags: [Customer - Restaurant], security: [{ bearerAuth: [] }], summary: Create a reward, responses: { 201: { description: Reward } } }
 */
rewardsRouter.get('/', validate({ query: rewardListQuerySchema }), RestaurantCustomerController.listRewards);
rewardsRouter.post('/', validate({ body: createRewardSchema }), requireRewardManage, RestaurantCustomerController.createReward);
rewardsRouter.patch('/:id', validate({ params: idParamSchema, body: updateRewardSchema }), requireRewardManage, RestaurantCustomerController.updateReward);
rewardsRouter.delete('/:id', validate({ params: idParamSchema }), requireRewardManage, RestaurantCustomerController.deleteReward);

export default { customersRouter, loyaltyRouter, rewardsRouter };
