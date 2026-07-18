import { Router } from 'express';
import { z } from 'zod';

import { validate } from '#core/validation/validate.middleware.js';

import { UpsellController } from '../controllers/upsell.controller.js';
import { restaurantGuards } from './_guards.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');

const recommendSchema = z
  .object({
    seedIds: z.array(objectId).max(30).default([]),
    excludeIds: z.array(objectId).max(60).default([]),
    limit: z.number().int().min(1).max(12).optional(),
  })
  .strict();

const ruleSchema = z
  .object({
    triggerProductIds: z.array(objectId).max(30).default([]),
    suggestProductId: objectId,
    weight: z.number().int().min(1).max(100).default(50),
    startHour: z.number().int().min(0).max(23).nullable().optional(),
    endHour: z.number().int().min(0).max(23).nullable().optional(),
    label: z.string().trim().max(60).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

const updateRuleSchema = ruleSchema.partial().refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

/**
 * @openapi
 * /api/v1/public/branches/{slug}/upsell:
 *   post: { tags: [Catalog - Upsell], summary: Ranked upsell suggestions for a product/cart, responses: { 200: { description: Suggestions } } }
 * /api/v1/restaurant/upsell/rules:
 *   get: { tags: [Catalog - Upsell], security: [{ bearerAuth: [] }], summary: List upsell rules, responses: { 200: { description: Rules } } }
 *   post: { tags: [Catalog - Upsell], security: [{ bearerAuth: [] }], summary: Create an upsell rule, responses: { 201: { description: Rule } } }
 * /api/v1/restaurant/upsell/learned:
 *   get: { tags: [Catalog - Upsell], security: [{ bearerAuth: [] }], summary: Top learned frequently-bought-together pairs, responses: { 200: { description: Pairs } } }
 */
export const publicUpsellRouter = Router();
publicUpsellRouter.post('/:slug/upsell', validate({ body: recommendSchema }), UpsellController.recommend);

export const upsellAdminRouter = Router();
upsellAdminRouter.use(...restaurantGuards);
upsellAdminRouter.get('/rules', UpsellController.listRules);
upsellAdminRouter.post('/rules', validate({ body: ruleSchema }), UpsellController.createRule);
upsellAdminRouter.patch('/rules/:id', validate({ body: updateRuleSchema }), UpsellController.updateRule);
upsellAdminRouter.delete('/rules/:id', UpsellController.removeRule);
upsellAdminRouter.get('/learned', UpsellController.learned);
