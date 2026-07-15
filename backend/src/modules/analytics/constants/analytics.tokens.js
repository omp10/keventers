/** DI tokens for the Analytics & Reporting Engine. */
const t = (name) => Symbol(`analytics.${name}`);

export const ANALYTICS_TOKENS = Object.freeze({
  // Repositories
  TimeBucketRepository: t('TimeBucketRepository'),
  EntityProjectionRepository: t('EntityProjectionRepository'),
  RebuildRunRepository: t('RebuildRunRepository'),

  // Services
  ProjectionService: t('ProjectionService'),
  DashboardService: t('DashboardService'),
  AdminAnalyticsService: t('AdminAnalyticsService'),
  RebuildService: t('RebuildService'),
  ExportService: t('ExportService'),

  // Extension points
  Exporter: t('Exporter'),
});

export default ANALYTICS_TOKENS;
