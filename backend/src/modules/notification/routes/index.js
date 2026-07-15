import { Router } from 'express';

import {
  adminCampaignsRouter,
  adminNotificationsRouter,
  adminOutboxRouter,
} from './admin.routes.js';
import customerRoutes from './customer.routes.js';
import {
  campaignsRouter,
  notificationsRouter,
  templatesRouter,
} from './restaurant.routes.js';

/**
 * Notification Engine router. Mounted at the API v1 root with SPECIFIC sub-paths
 * so it composes cleanly with the organization module (this module is registered
 * BEFORE organization, so these exact paths win).
 *
 *   /api/v1/notifications/...                                   (customer)
 *   /api/v1/restaurant/{notifications,notification-templates,notification-campaigns}
 *   /api/v1/admin/{notifications,notification-campaigns,notification-outbox}
 */
const router = Router();

router.use('/notifications', customerRoutes);

router.use('/restaurant/notifications', notificationsRouter);
router.use('/restaurant/notification-templates', templatesRouter);
router.use('/restaurant/notification-campaigns', campaignsRouter);

router.use('/admin/notifications', adminNotificationsRouter);
router.use('/admin/notification-campaigns', adminCampaignsRouter);
router.use('/admin/notification-outbox', adminOutboxRouter);

export default router;
