import { LOYALTY_TIER, TIER_ORDER } from '../constants/customer.constants.js';

/**
 * Pure tier math. The tier is a function of LIFETIME earned points (never the
 * spendable balance — redeeming points must not demote a customer). Thresholds
 * are injected from config so the economics are tunable without code changes.
 *
 * @param {number} lifetimePoints  cumulative earned points (>= 0)
 * @param {{silver:number, gold:number, platinum:number}} thresholds
 * @returns {string} tier
 */
export function resolveTier(lifetimePoints, thresholds) {
  const p = Number(lifetimePoints) || 0;
  if (p >= thresholds.platinum) return LOYALTY_TIER.PLATINUM;
  if (p >= thresholds.gold) return LOYALTY_TIER.GOLD;
  if (p >= thresholds.silver) return LOYALTY_TIER.SILVER;
  return LOYALTY_TIER.BRONZE;
}

/** Rank of a tier (higher = better). Unknown tiers rank below Bronze. */
export function tierRank(tier) {
  const idx = TIER_ORDER.indexOf(tier);
  return idx === -1 ? -1 : idx;
}

/** +1 upgrade, −1 downgrade, 0 unchanged. */
export function tierDirection(fromTier, toTier) {
  return Math.sign(tierRank(toTier) - tierRank(fromTier));
}
