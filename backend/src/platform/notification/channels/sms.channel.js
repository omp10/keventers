import { NotificationChannel } from './notification-channel.interface.js';

/**
 * SMS channel INTERFACE. A future provider adapter (e.g. Twilio, MSG91)
 * implements `send`. No provider is bound here.
 */
export class SmsChannel extends NotificationChannel {
  static type = 'sms';
}

export default SmsChannel;
