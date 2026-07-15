import { randomBytes } from 'node:crypto';

/**
 * Financial reference generators. Human-safe, unique, never a Mongo id.
 *  - internalTxnId: high-entropy random (unique index backstops it).
 *  - invoiceNumber: derived from the (unique) order number — one invoice/order.
 *  - merchantTransactionId: provider-facing id for an intent/refund.
 */
export function internalTxnId() {
  return `TXN-${randomBytes(9).toString('hex').toUpperCase()}`;
}

export function invoiceNumber(orderNumber) {
  return `INV-${orderNumber}`;
}

export function merchantTransactionId(orderNumber) {
  return `${orderNumber}-${randomBytes(4).toString('hex')}`;
}

export function refundReference(paymentRef) {
  return `RFND-${paymentRef}-${randomBytes(3).toString('hex')}`;
}
