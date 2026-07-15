import { DOMAIN, ENTITY_TYPE, METRIC } from '../constants/analytics.constants.js';

import { bucket, entity } from './instruction.js';

/**
 * QR / Session / Table analytics updaters (pure). Driven by QR + SESSION events.
 * Feeds the funnel (scan → session → order) + table utilization. Session duration
 * + conversion are recorded on session end/completion when known by the handler.
 */
export function onQrScanned() {
  return [bucket(DOMAIN.QR, { [METRIC.QR_SCANS]: 1 })];
}

export function onSessionCreated({ tableId } = {}) {
  const out = [bucket(DOMAIN.QR, { [METRIC.SESSIONS_STARTED]: 1 })];
  if (tableId) out.push(entity(DOMAIN.TABLES, ENTITY_TYPE.TABLE, tableId, { [METRIC.SESSIONS_STARTED]: 1 }));
  return out;
}

/** session.completed / session.ended → completed vs abandoned + duration + conversion. */
export function onSessionEnded({ tableId, durationMs, converted, completed }) {
  const metric = completed ? METRIC.SESSIONS_COMPLETED : METRIC.SESSIONS_ABANDONED;
  const inc = { [metric]: 1 };
  if (Number.isFinite(durationMs) && durationMs > 0) { inc[METRIC.SESSION_DURATION_SUM] = durationMs; inc[METRIC.SESSION_DURATION_COUNT] = 1; }
  if (converted) inc[METRIC.CONVERSIONS] = 1;
  const out = [bucket(DOMAIN.QR, inc)];
  if (tableId) {
    const tableInc = { [metric]: 1 };
    if (Number.isFinite(durationMs) && durationMs > 0) { tableInc[METRIC.OCCUPANCY_SECONDS] = Math.round(durationMs / 1000); tableInc[METRIC.SESSION_DURATION_SUM] = durationMs; tableInc[METRIC.SESSION_DURATION_COUNT] = 1; }
    out.push(entity(DOMAIN.TABLES, ENTITY_TYPE.TABLE, tableId, tableInc));
  }
  return out;
}
