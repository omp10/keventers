import { Router } from 'express';

import {
  adminCustomersRouter,
  adminLoyaltyRouter,
  adminRewardsRouter,
} from './admin.routes.js';
import customerRoutes from './customer.routes.js';
import {
  customersRouter,
  loyaltyRouter,
  rewardsRouter,
} from './restaurant.routes.js';

/**
 * Customer Platform router. Mounted at the API v1 root (basePath '/') with
 * SPECIFIC sub-paths so it composes cleanly with the organization module's broad
 * `/restaurant` and `/admin` routers (this module is registered BEFORE
 * organization, so these exact paths win).
 *
 *   /api/v1/customer/...                             (customer, guest-linked)
 *   /api/v1/restaurant/{customers,loyalty,rewards}   (staff)
 *   /api/v1/admin/{customers,loyalty,rewards}        (super admin)
 */
const router = Router();

router.use('/customer', customerRoutes);

router.use('/restaurant/customers', customersRouter);
router.use('/restaurant/loyalty', loyaltyRouter);
router.use('/restaurant/rewards', rewardsRouter);

router.use('/admin/customers', adminCustomersRouter);
router.use('/admin/loyalty', adminLoyaltyRouter);
router.use('/admin/rewards', adminRewardsRouter);

export default router;
