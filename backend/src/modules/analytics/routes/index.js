import { Router } from 'express';

import adminRoutes from './admin.routes.js';
import publicJourneyRoutes from './public-journey.routes.js';
import restaurantRoutes from './restaurant.routes.js';

/**
 * Analytics Engine router. Mounted at the API v1 root with SPECIFIC sub-paths so
 * it composes cleanly with the organization module (registered BEFORE org).
 *
 *   /api/v1/restaurant/analytics/...   (staff dashboards + export + rebuild)
 *   /api/v1/admin/analytics/...        (platform, super admin)
 */
const router = Router();

router.use('/restaurant/analytics', restaurantRoutes);
router.use('/admin/analytics', adminRoutes);
// Customer-app sink — anonymous by design; the journey exists before login does.
router.use('/public/journey', publicJourneyRoutes);

export default router;
