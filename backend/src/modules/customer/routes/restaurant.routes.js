import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { RestaurantCustomerController } from '../controllers/restaurant-customer.controller.js';
import { SubscriptionController } from '../controllers/subscription.controller.js';
import {
  adjustPointsSchema,
  createRewardSchema,
  customerListQuerySchema,
  idParamSchema,
  loyaltyLedgerQuerySchema,
  rewardListQuerySchema,
  updateRewardSchema,
  subscriptionPlanSchema,
  updateSubscriptionPlanSchema,
  subscriberListQuerySchema,
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

export const subscriptionsRouter = Router();
subscriptionsRouter.use(...managementGuards);
/**
 * @openapi
 * /api/v1/restaurant/subscription-plans:
 *   get: { tags: [Customer - Restaurant], security: [{ bearerAuth: [] }], summary: List subscription plans (incl. archived), responses: { 200: { description: Plans } } }
 *   post: { tags: [Customer - Restaurant], security: [{ bearerAuth: [] }], summary: Create a subscription plan, responses: { 201: { description: Plan } } }
 * /api/v1/restaurant/subscriptions:
 *   get: { tags: [Customer - Restaurant], security: [{ bearerAuth: [] }], summary: List subscribers, responses: { 200: { description: Subscribers } } }
 */
subscriptionsRouter.get('/plans', SubscriptionController.listPlans);
subscriptionsRouter.post('/plans', validate({ body: subscriptionPlanSchema }), SubscriptionController.createPlan);
subscriptionsRouter.patch('/plans/:id', validate({ params: idParamSchema, body: updateSubscriptionPlanSchema }), SubscriptionController.updatePlan);
subscriptionsRouter.delete('/plans/:id', validate({ params: idParamSchema }), SubscriptionController.archivePlan);
subscriptionsRouter.get('/', validate({ query: subscriberListQuerySchema }), SubscriptionController.listSubscribers);
subscriptionsRouter.patch('/:id/activate', validate({ params: idParamSchema }), SubscriptionController.activate);
subscriptionsRouter.patch('/:id/cancel', validate({ params: idParamSchema }), SubscriptionController.cancel);
