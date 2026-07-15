import { NotificationChannel } from './notification-channel.interface.js';

/**
 * Push-notification channel INTERFACE. A future provider adapter (e.g. FCM,
 * APNs, OneSignal) implements `send`. No provider is bound here.
 */
export class PushChannel extends NotificationChannel {
  static type = 'push';
}

export default PushChannel;
