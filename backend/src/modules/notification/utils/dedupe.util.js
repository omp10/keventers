import { createHash } from 'node:crypto';

/**
 * Build a stable deduplication key for an event → notification. The same event
 * (identified by its natural id, e.g. orderId + status, paymentId, refundId)
 * always yields the same key, so a replayed domain event never produces a
 * duplicate notification (enforced by a unique index + a Redis fast-path).
 *
 * @param {string} eventName
 * @param {string} recipientKey  stable recipient id (userId / sessionId / restaurantId)
 * @param {string} naturalId     the event's natural id (orderId:status, paymentId, …)
 */
export function dedupeKey(eventName, recipientKey, naturalId) {
  const raw = `${eventName}|${recipientKey ?? '-'}|${naturalId ?? '-'}`;
  return createHash('sha256').update(raw).digest('base64url').slice(0, 32);
}
