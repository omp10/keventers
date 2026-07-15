/** DI tokens for the Notification Engine. */
const t = (name) => Symbol(`notification.${name}`);

export const NOTIFICATION_TOKENS = Object.freeze({
  // Repositories
  NotificationRepository: t('NotificationRepository'),
  TemplateRepository: t('TemplateRepository'),
  PreferenceRepository: t('PreferenceRepository'),
  OutboxRepository: t('OutboxRepository'),
  DeliveryAttemptRepository: t('DeliveryAttemptRepository'),
  CampaignRepository: t('CampaignRepository'),

  // Services
  NotificationService: t('NotificationService'),
  TemplateService: t('TemplateService'),
  PreferenceService: t('PreferenceService'),
  OutboxService: t('OutboxService'),
  DeliveryService: t('DeliveryService'),
  CampaignService: t('CampaignService'),
  NotificationRealtimeService: t('NotificationRealtimeService'),

  // Provider registry (channel adapters)
  ProviderFactory: t('ProviderFactory'),
});

export default NOTIFICATION_TOKENS;
