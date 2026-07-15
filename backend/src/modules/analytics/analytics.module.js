import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';

import { ANALYTICS_PERMISSIONS } from './constants/analytics.constants.js';
import { ANALYTICS_TOKENS } from './constants/analytics.tokens.js';
import { registerAnalyticsEventHandlers } from './events/handlers.js';
import { exporterRegistry } from './interfaces/exporter.interface.js';
import { registerAnalyticsJobs, scheduleAnalyticsRecurring } from './queue/registrar.js';
import { entityProjectionRepository } from './repositories/entity-projection.repository.js';
import { rebuildRunRepository } from './repositories/rebuild-run.repository.js';
import { timeBucketRepository } from './repositories/time-bucket.repository.js';
import analyticsRouter from './routes/index.js';
import { adminAnalyticsService } from './services/admin-analytics.service.js';
import { dashboardService } from './services/dashboard.service.js';
import { exportService } from './services/export.service.js';
import { projectionService } from './services/projection.service.js';
import { rebuildService } from './services/rebuild.service.js';

/**
 * Analytics & Reporting Engine composition. PROJECTION-BASED + event-driven: it
 * consumes domain events from every module into read-optimized projection
 * collections and serves all dashboards from those — never from transactional
 * data (except the sanctioned rebuild/reconciliation read path). Registered
 * BEFORE the organization module so its specific `/restaurant/analytics`,
 * `/admin/analytics` paths win. Rebuild/reconcile workers start via the
 * composition root's JobManager after modules register.
 */
export const analyticsModule = {
  name: 'analytics',
  basePath: '/',
  router: analyticsRouter,

  registerDependencies(container = sharedContainer) {
    container.register(ANALYTICS_TOKENS.TimeBucketRepository, timeBucketRepository);
    container.register(ANALYTICS_TOKENS.EntityProjectionRepository, entityProjectionRepository);
    container.register(ANALYTICS_TOKENS.RebuildRunRepository, rebuildRunRepository);

    container.register(ANALYTICS_TOKENS.ProjectionService, projectionService);
    container.register(ANALYTICS_TOKENS.DashboardService, dashboardService);
    container.register(ANALYTICS_TOKENS.AdminAnalyticsService, adminAnalyticsService);
    container.register(ANALYTICS_TOKENS.RebuildService, rebuildService);
    container.register(ANALYTICS_TOKENS.ExportService, exportService);
    container.register(ANALYTICS_TOKENS.Exporter, exporterRegistry);
  },

  bootstrapRbac() {
    permissionRegistry.registerMany(Object.values(ANALYTICS_PERMISSIONS));
  },

  registerEventHandlers(eventBus = sharedEventBus) {
    registerAnalyticsEventHandlers(eventBus);
  },

  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.bootstrapRbac();
    this.registerEventHandlers(eventBus);
    registerAnalyticsJobs();
    scheduleAnalyticsRecurring();
    logger().info({ module: this.name }, 'Analytics & Reporting Engine registered');
    return this;
  },
};

export default analyticsModule;
