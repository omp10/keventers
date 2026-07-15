import { DOMAIN, METRIC } from '../constants/analytics.constants.js';

import { bucket } from './instruction.js';

/**
 * Customer analytics updaters (pure). Driven by CUSTOMER events. New vs returning
 * is decided by the handler (which knows whether the customer already existed);
 * the updater just records the classified counter. Loyalty earn/redeem +
 * referrals feed loyalty-performance widgets.
 */
export function onCustomerCreated({ returning = false } = {}) {
  return [bucket(DOMAIN.CUSTOMERS, returning ? { [METRIC.RETURNING_CUSTOMERS]: 1 } : { [METRIC.NEW_CUSTOMERS]: 1 })];
}

export function onLoyaltyEarned({ points }) {
  return [bucket(DOMAIN.CUSTOMERS, { [METRIC.LOYALTY_EARNED]: num(points) })];
}

export function onLoyaltyRedeemed({ points }) {
  return [bucket(DOMAIN.CUSTOMERS, { [METRIC.LOYALTY_REDEEMED]: num(points) })];
}

export function onReferralCompleted() {
  return [bucket(DOMAIN.CUSTOMERS, { [METRIC.REFERRALS_COMPLETED]: 1 })];
}

/** tier upgrades (flexible metric — a new key needs no schema change). */
export function onTierChanged({ upgraded = true } = {}) {
  return upgraded ? [bucket(DOMAIN.CUSTOMERS, { tierUpgrades: 1 })] : [];
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
