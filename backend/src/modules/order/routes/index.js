import { Router } from 'express';

import adminRoutes from './admin.routes.js';
import customerRoutes from './customer.routes.js';
import restaurantRoutes from './restaurant.routes.js';

/**
 * Order module router. Mounted at the API v1 root (basePath '/') with SPECIFIC
 * sub-paths so it composes cleanly with the organization module's broad
 * `/restaurant` and `/admin` routers (registered before organization).
 *
 *   /api/v1/orders/...              (customer — guest-session authenticated)
 *   /api/v1/restaurant/orders/...   (staff)
 *   /api/v1/admin/orders/...        (super-admin inspection)
 */
const router = Router();

router.use('/orders', customerRoutes);
router.use('/restaurant/orders', restaurantRoutes);
router.use('/admin/orders', adminRoutes);

export default router;
