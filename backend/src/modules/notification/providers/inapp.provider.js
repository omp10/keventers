import { NotificationChannel } from '#platform/notification/index.js';

import { PROVIDER } from '../constants/notification.constants.js';

/**
 * In-app channel. Unlike external channels there is no third-party provider: the
 * durable Notification document IS the delivered artifact (the inbox). "Sending"
 * an in-app notification succeeds immediately; the delivery service marks it
 * DELIVERED and emits a Socket.IO event so open clients update live.
 */
export class InAppChannel extends NotificationChannel {
  static type = 'inapp';

  constructor() {
    super();
    this.provider = PROVIDER.INAPP;
  }

  isReady() {
    return true;
  }

  async send(message) {
    // The record already exists; nothing external to call.
    return { success: true, providerMessageId: `inapp:${message?.data?.notificationId ?? ''}` };
  }
}

export const inAppChannel = new InAppChannel();
export default inAppChannel;
