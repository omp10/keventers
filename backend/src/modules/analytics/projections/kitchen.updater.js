import { DOMAIN, ENTITY_TYPE, METRIC } from '../constants/analytics.constants.js';

import { bucket, entity } from './instruction.js';

/**
 * Kitchen analytics updaters (pure). Driven by KITCHEN events enriched with the
 * queue entry (chef + station + SLA state) and a prep duration correlated from
 * the preparing→ready events. To avoid double counting, `onKitchenReady` records
 * readyCount + prep time + slaMet (only when NOT breached); the dedicated
 * `kitchen.sla.breached` event owns the breach + delayed counters.
 */
export function onKitchenReady({ prepMs, chefId, chefName, stationIds = [], breached }) {
  const readyInc = { [METRIC.READY_COUNT]: 1, ...(breached ? {} : { [METRIC.SLA_MET]: 1 }) };
  if (Number.isFinite(prepMs) && prepMs > 0) {
    readyInc[METRIC.PREP_TIME_SUM] = prepMs;
    readyInc[METRIC.PREP_TIME_COUNT] = 1;
  }
  const out = [bucket(DOMAIN.KITCHEN, readyInc)];
  if (chefId) out.push(entity(DOMAIN.KITCHEN, ENTITY_TYPE.CHEF, chefId, readyInc, chefName ?? null));
  for (const stationId of stationIds) out.push(entity(DOMAIN.KITCHEN, ENTITY_TYPE.STATION, stationId, { [METRIC.READY_COUNT]: 1, ...(breached ? {} : { [METRIC.SLA_MET]: 1 }) }));
  return out;
}

/** kitchen.sla.breached → the authoritative breach + delayed counters. */
export function onSlaBreached() {
  return [bucket(DOMAIN.KITCHEN, { [METRIC.SLA_BREACHED]: 1, [METRIC.DELAYED_ORDERS]: 1 })];
}
