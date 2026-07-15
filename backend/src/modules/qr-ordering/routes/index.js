import { Router } from 'express';

import { adminQrRouter, adminSessionsRouter, adminTablesRouter } from './admin.routes.js';
import { publicQrRouter, publicSessionRouter } from './public.routes.js';
import qrRoutes from './qr.routes.js';
import sessionRoutes from './session.routes.js';
import tableGroupRoutes from './table-group.routes.js';
import tableRoutes from './table.routes.js';

/**
 * QR Ordering module router. Mounted at the API v1 root (basePath '/') using
 * SPECIFIC full-path sub-mounts so it composes cleanly with the organization
 * module's broad `/public`, `/restaurant` and `/admin` routers. Registered
 * BEFORE organization so these exact paths win; anything else falls through.
 *
 *   /api/v1/public/qr/scan
 *   /api/v1/public/session/...
 *   /api/v1/restaurant/tables|table-groups|qr|sessions/...
 *   /api/v1/admin/tables|qr|sessions/...
 */
const router = Router();

router.use('/public/qr', publicQrRouter);
router.use('/public/session', publicSessionRouter);

router.use('/restaurant/tables', tableRoutes);
router.use('/restaurant/table-groups', tableGroupRoutes);
router.use('/restaurant/qr', qrRoutes);
router.use('/restaurant/sessions', sessionRoutes);

router.use('/admin/tables', adminTablesRouter);
router.use('/admin/qr', adminQrRouter);
router.use('/admin/sessions', adminSessionsRouter);

export default router;
