import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { PublicContentController } from '../controllers/admin-content.controller.js';
import { PublicDiscoveryController } from '../controllers/public-discovery.controller.js';
import {
  branchSlugParamSchema,
  discoveryQuerySchema,
  publicBannersQuerySchema,
  publicZonesQuerySchema,
  suggestQuerySchema,
} from '../validators/discovery.validators.js';

/**
 * Public discovery router (mounted under /api/v1/public). Unauthenticated —
 * a guest browses before any session exists. This implements the customer
 * app's documented discovery contract:
 *
 * @openapi
 * /api/v1/public/discovery/nearby:
 *   get: { tags: [Public/Discovery], summary: Nearby branches (geo-ranked, paginated), responses: { 200: { description: Branch list + pagination meta } } }
 * /api/v1/public/discovery/search:
 *   get: { tags: [Public/Discovery], summary: Search branches (q/filters/sort, paginated), responses: { 200: { description: Branch list + pagination meta } } }
 * /api/v1/public/discovery/popular:
 *   get: { tags: [Public/Discovery], summary: Popular rail, responses: { 200: { description: Branches } } }
 * /api/v1/public/discovery/featured:
 *   get: { tags: [Public/Discovery], summary: Featured/promoted rail, responses: { 200: { description: Branches } } }
 * /api/v1/public/discovery/suggest:
 *   get: { tags: [Public/Discovery], summary: Search autocomplete (areas/cities/cuisines/brands/branches), responses: { 200: { description: Suggestions } } }
 * /api/v1/public/branches/{slug}:
 *   get: { tags: [Public/Discovery], summary: Branch detail by SEO slug, responses: { 200: { description: Branch detail }, 404: { description: Not found } } }
 * /api/v1/public/banners:
 *   get: { tags: [Public/Discovery], summary: Live admin-curated promotional banners, responses: { 200: { description: Banners } } }
 * /api/v1/public/categories:
 *   get: { tags: [Public/Discovery], summary: Live admin-curated storefront categories, responses: { 200: { description: Categories } } }
 * /api/v1/public/zones:
 *   get: { tags: [Public/Discovery], summary: Active operating zones, responses: { 200: { description: Zones } } }
 */
const router = Router();

router.get('/discovery/nearby', validate({ query: discoveryQuerySchema }), PublicDiscoveryController.nearby);
router.get('/discovery/search', validate({ query: discoveryQuerySchema }), PublicDiscoveryController.search);
router.get('/discovery/popular', validate({ query: discoveryQuerySchema }), PublicDiscoveryController.popular);
router.get('/discovery/featured', validate({ query: discoveryQuerySchema }), PublicDiscoveryController.featured);
router.get('/discovery/suggest', validate({ query: suggestQuerySchema }), PublicDiscoveryController.suggest);
router.get('/branches/:slug', validate({ params: branchSlugParamSchema }), PublicDiscoveryController.branchBySlug);
router.get('/banners', validate({ query: publicBannersQuerySchema }), PublicDiscoveryController.banners);
router.get('/categories', PublicContentController.categories);
router.get('/zones', validate({ query: publicZonesQuerySchema }), PublicContentController.zones);

export default router;
