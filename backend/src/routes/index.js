import { Router } from 'express';

import healthRoutes from './health.routes.js';
import metricsRoutes from './metrics.routes.js';

/**
 * Root router registry.
 *
 * Operational probes (/health, /ready) are mounted at the root — unversioned,
 * so orchestrators (Docker, PM2, k8s) hit stable paths.
 *
 * Business modules will be mounted here under a versioned prefix in later
 * phases, e.g. `router.use('/v1', v1Router)`. No business routes exist yet.
 */
const router = Router();

router.use('/', healthRoutes);
router.use('/', metricsRoutes);

export default router;
