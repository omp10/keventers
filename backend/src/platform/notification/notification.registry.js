import { logger } from '#core/logging/logger.js';

/**
 * Registry of concrete notification channel implementations, keyed by channel
 * type ('email' | 'sms' | 'push' | 'whatsapp'). Provider adapters are bound
 * here at boot in later phases; the platform ships empty.
 */
export class NotificationRegistry {
  /** @type {Map<string, import('./channels/notification-channel.interface.js').NotificationChannel>} */
  #channels = new Map();

  register(channel) {
    const type = channel?.constructor?.type;
    if (!type) throw new Error('Channel must expose a static `type`');
    this.#channels.set(type, channel);
    logger().debug({ channel: type }, 'Notification channel registered');
    return this;
  }

  get(type) {
    return this.#channels.get(type) ?? null;
  }

  has(type) {
    return this.#channels.has(type);
  }

  list() {
    return [...this.#channels.keys()];
  }
}

export const notificationRegistry = new NotificationRegistry();
export default notificationRegistry;
