/**
 * Analytics & Reporting Engine — PUBLIC BARREL. The projection WRITE surface
 * (projectionService) + updaters are exported so a future domain can register a
 * new event consumer/updater without modifying existing analytics services. The
 * exporter registry is exported so a real Excel/PDF renderer can be registered.
 */
export { analyticsModule } from './analytics.module.js';

// Service singletons.
export { projectionService } from './services/projection.service.js';
export { dashboardService } from './services/dashboard.service.js';
export { adminAnalyticsService } from './services/admin-analytics.service.js';
export { rebuildService } from './services/rebuild.service.js';
export { exportService } from './services/export.service.js';

// Extension points: instruction builders + exporter registry.
export { bucket, entity } from './projections/instruction.js';
export { exporterRegistry, Exporter, CsvExporter, ExcelExporter, PdfExporter } from './interfaces/exporter.interface.js';

// DI tokens + events + constants.
export { ANALYTICS_TOKENS } from './constants/analytics.tokens.js';
export * from './events/analytics.events.js';
export { DOMAIN, PERIOD, ENTITY_TYPE, METRIC, ANALYTICS_PERMISSIONS } from './constants/analytics.constants.js';

// Seeder.
export { analyticsSeeder, AnalyticsSeeder } from './seeds/analytics.seeder.js';
