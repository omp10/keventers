import { DomainEvent } from '#core/eventbus/index.js';

/**
 * PROVIDER-INDEPENDENT payment events. Gateway-specific events are NEVER
 * published — consumers (Order, Kitchen, Notifications, Analytics, Loyalty)
 * react to these clean domain events, not to Razorpay/PhonePe payloads.
 */
export const PAYMENT_EVENTS = Object.freeze({
  INTENT_CREATED: 'payment.intent_created',
  PAYMENT_AUTHORIZED: 'payment.authorized',
  PAYMENT_CAPTURED: 'payment.captured',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_CANCELLED: 'payment.cancelled',
  REFUND_REQUESTED: 'payment.refund_requested',
  REFUND_COMPLETED: 'payment.refund_completed',
  REFUND_FAILED: 'payment.refund_failed',
  INVOICE_GENERATED: 'payment.invoice_generated',
  SETTLEMENT_CREATED: 'payment.settlement_created',
  SETTLEMENT_COMPLETED: 'payment.settlement_completed',
});

const ev = (name) =>
  class extends DomainEvent {
    static eventName = name;
  };

export const PaymentIntentCreatedEvent = ev(PAYMENT_EVENTS.INTENT_CREATED);
export const PaymentAuthorizedEvent = ev(PAYMENT_EVENTS.PAYMENT_AUTHORIZED);
export const PaymentCapturedEvent = ev(PAYMENT_EVENTS.PAYMENT_CAPTURED);
export const PaymentFailedEvent = ev(PAYMENT_EVENTS.PAYMENT_FAILED);
export const PaymentCancelledEvent = ev(PAYMENT_EVENTS.PAYMENT_CANCELLED);
export const RefundRequestedEvent = ev(PAYMENT_EVENTS.REFUND_REQUESTED);
export const RefundCompletedEvent = ev(PAYMENT_EVENTS.REFUND_COMPLETED);
export const RefundFailedEvent = ev(PAYMENT_EVENTS.REFUND_FAILED);
export const InvoiceGeneratedEvent = ev(PAYMENT_EVENTS.INVOICE_GENERATED);
export const SettlementCreatedEvent = ev(PAYMENT_EVENTS.SETTLEMENT_CREATED);
export const SettlementCompletedEvent = ev(PAYMENT_EVENTS.SETTLEMENT_COMPLETED);
