import { DOMAIN, ENTITY_TYPE, METRIC } from '../constants/analytics.constants.js';

import { bucket, entity } from './instruction.js';

/**
 * Payment analytics updaters (pure). Driven by PAYMENT events (provider + amount
 * in the payload). Feeds success/failure/refund rates + gateway distribution
 * (Razorpay vs PhonePe) as a per-provider EntityProjection.
 */
export function onPaymentCaptured({ provider, amount }) {
  const out = [bucket(DOMAIN.PAYMENTS, { [METRIC.PAYMENTS_CAPTURED]: 1, [METRIC.CAPTURED_AMOUNT]: num(amount) })];
  if (provider) out.push(entity(DOMAIN.PAYMENTS, ENTITY_TYPE.PROVIDER, provider, { [METRIC.PAYMENTS_CAPTURED]: 1, [METRIC.CAPTURED_AMOUNT]: num(amount) }, provider));
  return out;
}

export function onPaymentFailed({ provider }) {
  const out = [bucket(DOMAIN.PAYMENTS, { [METRIC.PAYMENTS_FAILED]: 1 })];
  if (provider) out.push(entity(DOMAIN.PAYMENTS, ENTITY_TYPE.PROVIDER, provider, { [METRIC.PAYMENTS_FAILED]: 1 }, provider));
  return out;
}

export function onRefundCompleted({ provider, amount }) {
  const out = [bucket(DOMAIN.PAYMENTS, { [METRIC.PAYMENTS_REFUNDED]: 1, [METRIC.REFUNDED_AMOUNT]: num(amount) })];
  out.push(bucket(DOMAIN.SALES, { [METRIC.REFUND_TOTAL]: num(amount) }));
  if (provider) out.push(entity(DOMAIN.PAYMENTS, ENTITY_TYPE.PROVIDER, provider, { [METRIC.PAYMENTS_REFUNDED]: 1, [METRIC.REFUNDED_AMOUNT]: num(amount) }, provider));
  return out;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
