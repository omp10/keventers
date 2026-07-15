import { DomainEvent } from '#core/eventbus/index.js';

/**
 * QR Ordering domain events. Published on every meaningful state change so
 * future modules (analytics, notifications, KDS, order) can react WITHOUT
 * coupling to the gateway internals. Names are stable + past-tense.
 */
export const QR_EVENTS = Object.freeze({
  QR_GENERATED: 'qr.generated',
  QR_REGENERATED: 'qr.regenerated',
  QR_ROTATED: 'qr.secret_rotated',
  QR_ENABLED: 'qr.enabled',
  QR_DISABLED: 'qr.disabled',
  QR_SCANNED: 'qr.scanned',

  SESSION_CREATED: 'session.created',
  SESSION_RECOVERED: 'session.recovered',
  SESSION_ACTIVATED: 'session.activated',
  SESSION_IDLE: 'session.idle',
  SESSION_CHECKOUT_PENDING: 'session.checkout_pending',
  SESSION_COMPLETED: 'session.completed',
  SESSION_EXPIRED: 'session.expired',
  SESSION_ENDED: 'session.ended',
  SESSION_LINKED_ACCOUNT: 'session.linked_account',

  TABLE_OCCUPIED: 'table.occupied',
  TABLE_RELEASED: 'table.released',
  TABLE_STATUS_CHANGED: 'table.status_changed',
});

// --- QR ---
export class QrGeneratedEvent extends DomainEvent {
  static eventName = QR_EVENTS.QR_GENERATED;
}
export class QrRegeneratedEvent extends DomainEvent {
  static eventName = QR_EVENTS.QR_REGENERATED;
}
export class QrRotatedEvent extends DomainEvent {
  static eventName = QR_EVENTS.QR_ROTATED;
}
export class QrEnabledEvent extends DomainEvent {
  static eventName = QR_EVENTS.QR_ENABLED;
}
export class QrDisabledEvent extends DomainEvent {
  static eventName = QR_EVENTS.QR_DISABLED;
}
export class QrScannedEvent extends DomainEvent {
  static eventName = QR_EVENTS.QR_SCANNED;
}

// --- Session ---
export class SessionCreatedEvent extends DomainEvent {
  static eventName = QR_EVENTS.SESSION_CREATED;
}
export class SessionRecoveredEvent extends DomainEvent {
  static eventName = QR_EVENTS.SESSION_RECOVERED;
}
export class SessionActivatedEvent extends DomainEvent {
  static eventName = QR_EVENTS.SESSION_ACTIVATED;
}
export class SessionIdleEvent extends DomainEvent {
  static eventName = QR_EVENTS.SESSION_IDLE;
}
export class SessionCheckoutPendingEvent extends DomainEvent {
  static eventName = QR_EVENTS.SESSION_CHECKOUT_PENDING;
}
export class SessionCompletedEvent extends DomainEvent {
  static eventName = QR_EVENTS.SESSION_COMPLETED;
}
export class SessionExpiredEvent extends DomainEvent {
  static eventName = QR_EVENTS.SESSION_EXPIRED;
}
export class SessionEndedEvent extends DomainEvent {
  static eventName = QR_EVENTS.SESSION_ENDED;
}
export class SessionLinkedAccountEvent extends DomainEvent {
  static eventName = QR_EVENTS.SESSION_LINKED_ACCOUNT;
}

// --- Table ---
export class TableOccupiedEvent extends DomainEvent {
  static eventName = QR_EVENTS.TABLE_OCCUPIED;
}
export class TableReleasedEvent extends DomainEvent {
  static eventName = QR_EVENTS.TABLE_RELEASED;
}
export class TableStatusChangedEvent extends DomainEvent {
  static eventName = QR_EVENTS.TABLE_STATUS_CHANGED;
}
