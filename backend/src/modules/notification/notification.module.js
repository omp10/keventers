import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';

import { NOTIFICATION_PERMISSIONS } from './constants/notification.constants.js';
import { NOTIFICATION_TOKENS } from './constants/notification.tokens.js';
import { registerNotificationEventHandlers } from './events/handlers.js';
import { notificationProviderFactory } from './providers/provider.factory.js';
import { registerNotificationJobs, scheduleNotificationRecurring } from './queue/registrar.js';
import { campaignRepository } from './repositories/campaign.repository.js';
import { deliveryAttemptRepository } from './repositories/delivery-attempt.repository.js';
import { notificationRepository } from './repositories/notification.repository.js';
import { outboxRepository } from './repositories/outbox.repository.js';
import { preferenceRepository } from './repositories/preference.repository.js';
import { templateRepository } from './repositories/template.repository.js';
import notificationRouter from './routes/index.js';
import { campaignService } from './services/campaign.service.js';
import { deliveryService } from './services/delivery.service.js';
import { notificationService } from './services/notification.service.js';
import { notificationRealtimeService } from './services/notification-realtime.service.js';
import { outboxService } from './services/outbox.service.js';
import { preferenceService } from './services/preference.service.js';
import { templateService } from './services/template.service.js';

/**
 * Notification & Communication Engine composition. Entirely EVENT-DRIVEN: it
 * consumes Order/Payment/Kitchen/Customer/Organization events into a durable
 * OUTBOX, a relay worker fans them into per-channel Notification docs, and a
 * delivery worker sends them through the PLATFORM channel dispatcher (provider
 * adapters registered here — interchangeable via config). Registered BEFORE the
 * organization module so its specific `/notifications`, `/restaurant/*`,
 * `/admin/*` paths win. Workers are started by the composition root's JobManager
 * after all modules register.
 */
export const notificationModule = {
  name: 'notification',
  basePath: '/',
  router: notificationRouter,

  registerDependencies(container = sharedContainer) {
    container.register(NOTIFICATION_TOKENS.NotificationRepository, notificationRepository);
    container.register(NOTIFICATION_TOKENS.TemplateRepository, templateRepository);
    container.register(NOTIFICATION_TOKENS.PreferenceRepository, preferenceRepository);
    container.register(NOTIFICATION_TOKENS.OutboxRepository, outboxRepository);
    container.register(NOTIFICATION_TOKENS.DeliveryAttemptRepository, deliveryAttemptRepository);
    container.register(NOTIFICATION_TOKENS.CampaignRepository, campaignRepository);

    container.register(NOTIFICATION_TOKENS.ProviderFactory, notificationProviderFactory);
    container.register(NOTIFICATION_TOKENS.NotificationService, notificationService);
    container.register(NOTIFICATION_TOKENS.TemplateService, templateService);
    container.register(NOTIFICATION_TOKENS.PreferenceService, preferenceService);
    container.register(NOTIFICATION_TOKENS.OutboxService, outboxService);
    container.register(NOTIFICATION_TOKENS.DeliveryService, deliveryService);
    container.register(NOTIFICATION_TOKENS.CampaignService, campaignService);
    container.register(NOTIFICATION_TOKENS.NotificationRealtimeService, notificationRealtimeService);
  },

  bootstrapRbac() {
    permissionRegistry.registerMany(Object.values(NOTIFICATION_PERMISSIONS));
  },

  registerEventHandlers(eventBus = sharedEventBus) {
    registerNotificationEventHandlers(eventBus);
  },

  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.bootstrapRbac();
    this.registerEventHandlers(eventBus);

    // Bind the ACTIVE provider per channel into the platform registry.
    notificationProviderFactory.registerAll();
    // Register BullMQ job definitions (workers start via the JobManager).
    registerNotificationJobs();
    // Best-effort: schedule the repeatable outbox relay sweep.
    scheduleNotificationRecurring();

    logger().info({ module: this.name }, 'Notification & Communication Engine registered');
    return this;
  },
};

export default notificationModule;
