import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { CustomerController } from '../controllers/customer.controller.js';
import { SubscriptionController } from '../controllers/subscription.controller.js';
import { FeedbackController } from '../controllers/feedback.controller.js';
import {
  addressSchema,
  idParamSchema,
  redeemSchema,
  subscribeSchema,
  feedbackSchema,
  updateAddressSchema,
  updatePreferencesSchema,
  updateProfileSchema,
} from '../validators/customer.validators.js';

import { customerGuards } from './_guards.js';

const router = Router();

router.use(...customerGuards);

/**
 * @openapi
 * /api/v1/customer/profile:
 *   get: { tags: [Customer], security: [{ bearerAuth: [] }], summary: Get my customer profile, responses: { 200: { description: Profile } } }
 *   patch: { tags: [Customer], security: [{ bearerAuth: [] }], summary: Update my profile (name/phone/marketing opt-in), responses: { 200: { description: Updated profile } } }
 * /api/v1/customer/orders:
 *   get: { tags: [Customer], security: [{ bearerAuth: [] }], summary: My order history (session-scoped), responses: { 200: { description: Orders } } }
 * /api/v1/customer/loyalty:
 *   get: { tags: [Customer], security: [{ bearerAuth: [] }], summary: My loyalty account + points ledger, responses: { 200: { description: Loyalty } } }
 * /api/v1/customer/rewards:
 *   get: { tags: [Customer], security: [{ bearerAuth: [] }], summary: Rewards I can redeem, responses: { 200: { description: Rewards } } }
 * /api/v1/customer/redeem:
 *   post: { tags: [Customer], security: [{ bearerAuth: [] }], summary: Redeem a reward for points (issues a pricing-ready voucher), responses: { 201: { description: Redemption }, 409: { description: Insufficient points } } }
 * /api/v1/customer/redemptions:
 *   get: { tags: [Customer], security: [{ bearerAuth: [] }], summary: My reward redemptions, responses: { 200: { description: Redemptions } } }
 * /api/v1/customer/preferences:
 *   get: { tags: [Customer], security: [{ bearerAuth: [] }], summary: My preferences, responses: { 200: { description: Preferences } } }
 *   patch: { tags: [Customer], security: [{ bearerAuth: [] }], summary: Update my preferences, responses: { 200: { description: Updated preferences } } }
 * /api/v1/customer/addresses:
 *   get: { tags: [Customer], security: [{ bearerAuth: [] }], summary: My saved addresses, responses: { 200: { description: Addresses } } }
 *   post: { tags: [Customer], security: [{ bearerAuth: [] }], summary: Add an address, responses: { 201: { description: Address } } }
 */
router.get('/profile', CustomerController.getProfile);
router.patch('/profile', validate({ body: updateProfileSchema }), CustomerController.updateProfile);

router.get('/orders', CustomerController.getOrders);
router.get('/loyalty', CustomerController.getLoyalty);
router.get('/rewards', CustomerController.getRewards);
router.post('/redeem', validate({ body: redeemSchema }), CustomerController.redeem);
router.get('/redemptions', CustomerController.getRedemptions);

router.get('/preferences', CustomerController.getPreferences);
router.patch('/preferences', validate({ body: updatePreferencesSchema }), CustomerController.updatePreferences);

/**
 * @openapi
 * /api/v1/customer/subscription-plans:
 *   get: { tags: [Customer], security: [{ bearerAuth: [] }], summary: Active subscription plans for my restaurant, responses: { 200: { description: Plans } } }
 * /api/v1/customer/subscriptions:
 *   get: { tags: [Customer], security: [{ bearerAuth: [] }], summary: My subscriptions, responses: { 200: { description: Subscriptions } } }
 *   post: { tags: [Customer], security: [{ bearerAuth: [] }], summary: Subscribe to a plan (settled at the counter), responses: { 201: { description: Subscription } } }
 */
router.get('/subscription-plans', SubscriptionController.plans);
router.get('/subscriptions', SubscriptionController.mine);
router.post('/subscriptions', validate({ body: subscribeSchema }), SubscriptionController.subscribe);

router.post('/feedback', validate({ body: feedbackSchema }), FeedbackController.submit);
router.get('/feedback/:orderId', FeedbackController.getForOrder);

router.get('/addresses', CustomerController.listAddresses);
router.post('/addresses', validate({ body: addressSchema }), CustomerController.addAddress);
router.patch('/addresses/:id', validate({ params: idParamSchema, body: updateAddressSchema }), CustomerController.updateAddress);
router.delete('/addresses/:id', validate({ params: idParamSchema }), CustomerController.removeAddress);

export default router;
