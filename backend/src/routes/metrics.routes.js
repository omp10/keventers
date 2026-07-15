import { Router } from 'express';

import { config } from '#config';
import { metrics } from '#core/observability/metrics.js';
import { asyncHandler } from '#core/http/async-handler.js';

const router = Router();

/**
 * Prometheus scrape endpoint. Operational only — exposes process/HTTP metrics,
 * no business data. Disabled when METRICS_ENABLED=false.
 */
router.get(
  config.observability.metrics.route,
  asyncHandler(async (_req, res) => {
    if (!metrics.enabled) {
      res.status(404).type('text/plain').send('metrics disabled');
      return;
    }
    res.set('Content-Type', metrics.contentType());
    res.send(await metrics.render());
  }),
);

export default router;
