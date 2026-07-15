import { logger } from '#core/logging/logger.js';

import { notificationRegistry } from './notification.registry.js';

/**
 * Notification dispatcher. Routes a message to a registered channel by type.
 * This is the reusable orchestration surface — WHICH notifications get sent
 * (templates, triggers) is business logic added in later phases.
 */
export class NotificationService {
  constructor(registry = notificationRegistry) {
    this.registry = registry;
  }

  /**
   * @param {'email'|'sms'|'push'|'whatsapp'} type
   * @param {import('./channels/notification-channel.interface.js').NotificationMessage} message
   * @returns {Promise<import('./channels/notification-channel.interface.js').NotificationResult>}
   */
  async send(type, message) {
    const channel = this.registry.get(type);
    if (!channel) {
      logger().warn({ type }, 'No notification channel registered for type');
      return { success: false, error: `No channel registered for "${type}"` };
    }
    return channel.send(message);
  }

  /** Send the same message across several channels; returns per-channel results. */
  async broadcast(types = [], message) {
    const results = await Promise.all(
      types.map(async (type) => ({ type, result: await this.send(type, message) })),
    );
    return results;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
