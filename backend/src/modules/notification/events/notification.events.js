import { DomainEvent } from '#core/eventbus/index.js';

/**
 * Notification lifecycle events (PUBLISHED). Analytics + future modules consume
 * these to report deliverability. They are provider-independent — never a raw
 * Twilio/FCM payload.
 */
export const NOTIFICATION_EVENTS = Object.freeze({
  QUEUED: 'notification.queued',
  SENT: 'notification.sent',
  DELIVERED: 'notification.delivered',
  READ: 'notification.read',
  FAILED: 'notification.failed',
});

const ev = (name) =>
  class extends DomainEvent {
    static eventName = name;
  };

export const NotificationQueuedEvent = ev(NOTIFICATION_EVENTS.QUEUED);
export const NotificationSentEvent = ev(NOTIFICATION_EVENTS.SENT);
export const NotificationDeliveredEvent = ev(NOTIFICATION_EVENTS.DELIVERED);
export const NotificationReadEvent = ev(NOTIFICATION_EVENTS.READ);
export const NotificationFailedEvent = ev(NOTIFICATION_EVENTS.FAILED);
