import { metrics } from '#core/observability/metrics.js';

/**
 * Records HTTP request duration into the metrics registry on response finish.
 * Uses the matched route path (not the raw URL) as a label to keep cardinality
 * bounded.
 */
export function metricsMiddleware(req, res, next) {
  if (!metrics.enabled) return next();

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route?.path
      ? `${req.baseUrl || ''}${req.route.path}`
      : req.path || 'unknown';
    metrics.observeHttp({
      method: req.method,
      route,
      status: res.statusCode,
      durationSeconds,
    });
  });

  return next();
}

export default metricsMiddleware;
