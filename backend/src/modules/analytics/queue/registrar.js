import { config } from '#config';
import { logger } from '#core/logging/logger.js';
import { jobRegistry, Scheduler } from '#platform/jobs/index.js';

import { JOB_NAMES, QUEUES } from '../constants/analytics.constants.js';
import { rebuildService } from '../services/rebuild.service.js';

/**
 * Registers the analytics rebuild/reconciliation BullMQ jobs (pure — no Redis
 * I/O) and, best-effort, schedules the periodic reconciliation sweep. Rebuilds
 * run OFF the request path so a large recompute never blocks a dashboard. Job
 * data carries a resolved scope + optional range; the processor delegates to the
 * rebuild service (the only sanctioned transactional-read path).
 */
export function registerAnalyticsJobs({ registry = jobRegistry, rebuild = rebuildService } = {}) {
  registry.register(
    QUEUES.REBUILD,
    async (job) => {
      const d = job.data ?? {};
      if (job.name === JOB_NAMES.RECONCILE) return { skipped: 'reconcile-sweep-noop' }; // reconcile is on-demand (fast aggregate); no cross-tenant sweep in this phase
      // Full rebuild: heavy recompute runs HERE (off the request thread), with a
      // pre-resolved scope + the RUNNING run id created by fullRebuild().
      if (d.scope && d.runId) return rebuild.runQueuedRebuild(d);
      return { skipped: 'no_target' };
    },
    { jobOptions: { attempts: 2, backoff: { type: 'exponential', delay: 5000 } }, concurrency: 1 },
  );

  logger().info('Analytics jobs registered');
}

/** Best-effort scheduling of the daily reconciliation sweep. */
export async function scheduleAnalyticsRecurring() {
  try {
    await Scheduler.schedule(QUEUES.REBUILD, JOB_NAMES.RECONCILE, {}, config.analytics.rebuild.reconcileCron);
    logger().info({ cron: config.analytics.rebuild.reconcileCron }, 'Analytics reconciliation sweep scheduled');
  } catch (err) {
    logger().warn({ err }, 'scheduling analytics reconciliation failed (will retry on next boot)');
  }
}
