import { Router } from 'express';

import { healthService } from '#core/health/health.service.js';
import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [System]
 *     summary: Liveness probe
 *     description: Returns 200 while the process is running. Performs no I/O.
 *     responses:
 *       200:
 *         description: Service is alive.
 */
router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    ApiResponse.success(res, { data: healthService.liveness() });
  }),
);

/**
 * @openapi
 * /ready:
 *   get:
 *     tags: [System]
 *     summary: Readiness probe
 *     description: Verifies server, MongoDB and Redis. 200 when ready, 503 otherwise.
 *     responses:
 *       200:
 *         description: All dependencies healthy; ready to serve traffic.
 *       503:
 *         description: One or more dependencies are unavailable.
 */
router.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const result = await healthService.readiness();
    ApiResponse.success(res, {
      data: result,
      statusCode: result.status === 'ready' ? 200 : 503,
    });
  }),
);

export default router;
