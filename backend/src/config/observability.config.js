/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildObservabilityConfig(env) {
  return {
    metrics: {
      enabled: env.METRICS_ENABLED,
      route: env.METRICS_ROUTE,
    },
  };
}
