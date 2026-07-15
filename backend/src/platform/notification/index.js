/**
 * Notification platform — public barrel. Interfaces + dispatcher only; no
 * provider is bound and no business notification is defined.
 */
export { NotificationChannel } from './channels/notification-channel.interface.js';
export { EmailChannel } from './channels/email.channel.js';
export { SmsChannel } from './channels/sms.channel.js';
export { PushChannel } from './channels/push.channel.js';
export { WhatsAppChannel } from './channels/whatsapp.channel.js';
export { notificationRegistry, NotificationRegistry } from './notification.registry.js';
export { notificationService, NotificationService } from './notification.service.js';
