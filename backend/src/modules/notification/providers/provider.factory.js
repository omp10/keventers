import { config } from '#config';
import { logger } from '#core/logging/logger.js';
import { notificationRegistry } from '#platform/notification/index.js';

import { CHANNEL, PROVIDER } from '../constants/notification.constants.js';

import { ResendEmailProvider } from './email/resend.provider.js';
import { SmtpEmailProvider } from './email/smtp.provider.js';
import { FcmPushProvider } from './push/fcm.provider.js';
import { inAppChannel } from './inapp.provider.js';
import { MetaWhatsAppProvider } from './whatsapp/meta.provider.js';
import { TwilioSmsProvider } from './sms/twilio.provider.js';

/**
 * Provider factory / registrar. Builds the ACTIVE provider adapter per channel
 * (chosen in config → interchangeable) and registers it into the PLATFORM
 * notification registry, so the platform dispatcher (`notificationService.send`)
 * routes to it. Business services depend only on the channel interface and never
 * reference a concrete provider. Adding a provider = one entry here.
 */
export class NotificationProviderFactory {
  constructor({ notifyConfig = config.notification, smtpTransport = null } = {}) {
    this.cfg = notifyConfig;
    this.smtpTransport = smtpTransport;
  }

  buildEmail() {
    const which = this.cfg.providers.email;
    if (which === PROVIDER.RESEND) return new ResendEmailProvider({ config: this.cfg });
    return new SmtpEmailProvider({ transport: this.smtpTransport, config: this.cfg });
  }

  buildSms() {
    return new TwilioSmsProvider({ config: this.cfg });
  }

  buildWhatsApp() {
    return new MetaWhatsAppProvider({ config: this.cfg });
  }

  buildPush() {
    return new FcmPushProvider({ config: this.cfg });
  }

  /** Instantiate every channel's active provider (keyed by channel type). */
  buildAll() {
    return {
      [CHANNEL.IN_APP]: inAppChannel,
      [CHANNEL.EMAIL]: this.buildEmail(),
      [CHANNEL.SMS]: this.buildSms(),
      [CHANNEL.WHATSAPP]: this.buildWhatsApp(),
      [CHANNEL.PUSH]: this.buildPush(),
    };
  }

  /** Register the active provider for every channel into the platform registry. */
  registerAll(registry = notificationRegistry) {
    const providers = this.buildAll();
    for (const channel of Object.values(providers)) registry.register(channel);
    const ready = Object.entries(providers).filter(([, c]) => c.isReady?.()).map(([t]) => t);
    logger().info({ channels: registry.list(), ready }, 'Notification providers registered');
    return providers;
  }
}

export const notificationProviderFactory = new NotificationProviderFactory();
export default notificationProviderFactory;
