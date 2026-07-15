import { Router } from 'express';

import adminOnboardingRoutes from './admin-onboarding.routes.js';
import adminOrganizationRoutes from './admin-organization.routes.js';
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
router.use('/admin/onboarding', adminOnboardingRoutes);
router.use('/admin/organizations', adminOrganizationRoutes);
router.use('/restaurant', restaurantRoutes);

export default router;
