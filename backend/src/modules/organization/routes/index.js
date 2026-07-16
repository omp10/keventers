import { Router } from 'express';

import {
  categoryAdminRouter,
  kitchenAdminRouter,
  mediaAdminRouter,
  zoneAdminRouter,
} from './admin-content.routes.js';
import adminOnboardingRoutes from './admin-onboarding.routes.js';
import adminOrganizationRoutes from './admin-organization.routes.js';
import bannerAdminRoutes from './banner-admin.routes.js';
import publicDiscoveryRoutes from './public-discovery.routes.js';
import publicRoutes from './public.routes.js';
import restaurantRoutes from './restaurant.routes.js';

/**
 * Organization module router. Mounted at the API v1 root (basePath '/'), so its
 * sub-routers resolve to:
 *   /api/v1/public/...            (public onboarding)
 *   /api/v1/admin/onboarding/...  (super-admin review)
 *   /api/v1/admin/organizations/… (super-admin org management)
 *   /api/v1/restaurant/...        (tenant-scoped restaurant management)
 */
const router = Router();

router.use('/public', publicRoutes);
router.use('/public', publicDiscoveryRoutes); // discovery/branches/banners (customer app)
router.use('/admin/onboarding', adminOnboardingRoutes);
router.use('/admin/organizations', adminOrganizationRoutes);
router.use('/admin/banners', bannerAdminRoutes);
router.use('/admin/categories', categoryAdminRouter);
router.use('/admin/zones', zoneAdminRouter);
router.use('/admin/kitchens', kitchenAdminRouter);
router.use('/admin/media', mediaAdminRouter);
router.use('/restaurant', restaurantRoutes);

export default router;
