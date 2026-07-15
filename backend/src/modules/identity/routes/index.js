import { Router } from 'express';

import authRoutes from './auth.routes.js';
import permissionRoutes from './permission.routes.js';
import roleRoutes from './role.routes.js';
import staffRoutes from './staff.routes.js';
import userRoutes from './user.routes.js';

/**
 * Identity module router. Mounted by the API v1 aggregator at
 * `/api/v1/identity`.
 */
const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/staff', staffRoutes);

export default router;
