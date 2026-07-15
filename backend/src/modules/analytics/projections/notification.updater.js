import { DOMAIN, ENTITY_TYPE, METRIC } from '../constants/analytics.constants.js';

import { bucket, entity } from './instruction.js';

/**
 * Notification analytics updaters (pure). Driven by NOTIFICATION lifecycle events.
 * Feeds delivery/read/failure rates + per-channel performance (EntityProjection).
 */
const STATUS_METRIC = {
  'notification.queued': METRIC.NTF_QUEUED,
  'notification.sent': METRIC.NTF_SENT,
  'notification.delivered': METRIC.NTF_DELIVERED,
  'notification.read': METRIC.NTF_READ,
  'notification.failed': METRIC.NTF_FAILED,
};

export function onNotificationEvent(eventName, { channel }) {
  const metric = STATUS_METRIC[eventName];
  if (!metric) return [];
  const out = [bucket(DOMAIN.NOTIFICATIONS, { [metric]: 1 })];
  if (channel) out.push(entity(DOMAIN.NOTIFICATIONS, ENTITY_TYPE.CHANNEL, channel, { [metric]: 1 }, channel));
  return out;
}
