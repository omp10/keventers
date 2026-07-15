import { Router } from 'express';

import cartRoutes from './cart.routes.js';

/**
 * Cart module router. Mounted at the API v1 root (basePath '/') at the specific
 * `/cart` path (no collision with other modules). Guest-session authenticated.
 */
const router = Router();

router.use('/cart', cartRoutes);

export default router;
