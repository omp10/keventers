import client from 'prom-client';

import { config } from '#config';

/**
 * Metrics abstraction over prom-client. Business code depends on the small
 * surface here (counter/gauge/histogram/observeHttp), not on prom-client
 * directly — so the backend can be swapped (OpenTelemetry, StatsD) later.
 */
export class MetricsService {
  constructor() {
    this.enabled = config.observability.metrics.enabled;
    this.registry = new client.Registry();
    this.registry.setDefaultLabels({ service: 'keventers-api', env: config.server.env });
    this.#instruments = new Map();

    if (this.enabled) {
      client.collectDefaultMetrics({ register: this.registry });
      this.httpDuration = this.histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'route', 'status'],
        buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      });
    }
  }

  #instruments;

  #memo(name, factory) {
    if (!this.#instruments.has(name)) this.#instruments.set(name, factory());
    return this.#instruments.get(name);
  }

  counter({ name, help, labelNames = [] }) {
    return this.#memo(name, () => new client.Counter({ name, help, labelNames, registers: [this.registry] }));
  }

  gauge({ name, help, labelNames = [] }) {
    return this.#memo(name, () => new client.Gauge({ name, help, labelNames, registers: [this.registry] }));
  }

  histogram({ name, help, labelNames = [], buckets }) {
    return this.#memo(
      name,
      () => new client.Histogram({ name, help, labelNames, buckets, registers: [this.registry] }),
    );
  }

  /** Record one HTTP request's outcome. */
  observeHttp({ method, route, status, durationSeconds }) {
    if (!this.enabled) return;
    this.httpDuration.observe({ method, route, status }, durationSeconds);
  }

  /** Prometheus exposition text (for the /metrics route). */
  async render() {
    return this.registry.metrics();
  }

  contentType() {
    return this.registry.contentType;
  }
}

export const metrics = new MetricsService();
export default metrics;
