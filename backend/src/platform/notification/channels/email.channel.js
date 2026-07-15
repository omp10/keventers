import { NotificationChannel } from './notification-channel.interface.js';

/**
 * Email channel INTERFACE. A future provider adapter (e.g. SendGrid, SES,
 * Nodemailer) extends this and implements `send`. No provider is bound here.
 */
export class EmailChannel extends NotificationChannel {
  static type = 'email';
}

export default EmailChannel;
