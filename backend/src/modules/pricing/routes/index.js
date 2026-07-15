import { Router } from 'express';

import couponRoutes from './coupon.routes.js';

/**
 * Pricing module router. The Pricing Engine itself is a pure library (no HTTP
 * surface — Cart/Orders/Payments call it in-process). The only routes are
 * restaurant coupon management, mounted at a SPECIFIC path so it composes
 * cleanly with the organization module's broad `/restaurant` router (registered
 * before organization).
 */
const router = Router();

router.use('/restaurant/coupons', couponRoutes);

export default router;
