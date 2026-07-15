import { Router } from 'express';

import {
  adminPaymentsRouter,
  adminSettlementsRouter,
  adminTransactionsRouter,
} from './admin.routes.js';
import customerRoutes from './customer.routes.js';
import {
  configRouter,
  invoicesRouter,
  paymentsRouter,
  refundsRouter,
  transactionsRouter,
} from './restaurant.routes.js';
import webhookRoutes from './webhook.routes.js';

/**
 * Payment Engine router. Mounted at the API v1 root (basePath '/') with SPECIFIC
 * sub-paths so it composes cleanly with the organization module's broad
 * `/restaurant` and `/admin` routers (registered before organization). Webhooks
 * are unauthenticated (signature-verified inside the service).
 *
 *   /api/v1/payments/...                      (customer)
 *   /api/v1/restaurant/{payments,transactions,refunds,invoices,payment-config}
 *   /api/v1/admin/{payments,transactions,settlements}
 *   /api/v1/webhooks/{razorpay,phonepe}
 */
const router = Router();

router.use('/payments', customerRoutes);

router.use('/restaurant/payments', paymentsRouter);
router.use('/restaurant/transactions', transactionsRouter);
router.use('/restaurant/refunds', refundsRouter);
router.use('/restaurant/invoices', invoicesRouter);
router.use('/restaurant/payment-config', configRouter);

router.use('/admin/payments', adminPaymentsRouter);
router.use('/admin/transactions', adminTransactionsRouter);
router.use('/admin/settlements', adminSettlementsRouter);

router.use('/webhooks', webhookRoutes);

export default router;
