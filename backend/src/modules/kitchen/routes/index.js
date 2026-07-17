import { Router } from 'express';

import adminRoutes from './admin.routes.js';
import restaurantRoutes from './restaurant.routes.js';
import staffRoutes from './staff.routes.js';

/**
 * Kitchen (KDS) module router. Mounted at the API v1 root (basePath '/') with
 * SPECIFIC sub-paths so it composes cleanly with the organization module's broad
 * `/restaurant` and `/admin` routers (registered before organization).
 *
 *   /api/v1/restaurant/kitchen/...   (staff console)
 *   /api/v1/admin/kitchen/...        (super-admin inspection)
 */
const router = Router();

// Staff first: `/my/*` must match before the manager-guarded catch-all router.
router.use('/restaurant/kitchen/my', staffRoutes);
router.use('/restaurant/kitchen', restaurantRoutes);
router.use('/admin/kitchen', adminRoutes);

export default router;
