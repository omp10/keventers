/**
 * Analytics Engine configuration. Reliability/perf knobs for projections,
 * dashboard caching and the rebuild/reconciliation jobs.
 *
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildAnalyticsConfig(env) {
  return {
    cache: {
      dashboardTtlSeconds: env.ANALYTICS_DASHBOARD_CACHE_TTL_SECONDS,
      kpiTtlSeconds: env.ANALYTICS_KPI_CACHE_TTL_SECONDS,
      trendingTtlSeconds: env.ANALYTICS_TRENDING_CACHE_TTL_SECONDS,
    },
    prepCorrelationTtlSeconds: env.ANALYTICS_PREP_CORRELATION_TTL_SECONDS,
    rebuild: {
      batchSize: env.ANALYTICS_REBUILD_BATCH_SIZE,
      reconcileCron: env.ANALYTICS_RECONCILE_CRON,
      reconcileToleranceMinor: env.ANALYTICS_RECONCILE_TOLERANCE_MINOR,
    },
    scopeCacheTtlSeconds: env.ANALYTICS_SCOPE_CACHE_TTL_SECONDS,
  };
}
