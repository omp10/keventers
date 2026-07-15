/**
 * Notification & Communication Engine — PUBLIC BARREL. Analytics (Phase 4.11)
 * consumes the notification lifecycle EVENTS from here for deliverability
 * reporting. Provider adapters + the factory are exported so new channels/
 * providers register without touching business services.
 */
export { notificationModule } from './notification.module.js';

// Service singletons.
export { notificationService } from './services/notification.service.js';
export { templateService } from './services/template.service.js';
export { preferenceService } from './services/preference.service.js';
export { outboxService } from './services/outbox.service.js';
export { deliveryService } from './services/delivery.service.js';
export { campaignService } from './services/campaign.service.js';

// Provider abstraction (register future channels/providers here).
export { notificationProviderFactory, NotificationProviderFactory } from './providers/provider.factory.js';

// DI tokens + events + constants.
export { NOTIFICATION_TOKENS } from './constants/notification.tokens.js';
export * from './events/notification.events.js';
export {
  CHANNEL,
  CATEGORY,
  NOTIFICATION_STATUS,
  TEMPLATE_KEY,
  PRIORITY,
  NOTIFICATION_PERMISSIONS,
} from './constants/notification.constants.js';

// Seeder.
export { notificationSeeder, NotificationSeeder } from './seeds/notification.seeder.js';
