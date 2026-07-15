/**
 * Customer Platform & Loyalty configuration. Loyalty economics (earn rate, tier
 * thresholds, expiry) are env-driven so they can be tuned per deployment WITHOUT
 * touching the loyalty engine. Points are integers; money is compared in MINOR
 * units by the services (never floats).
 *
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildCustomerConfig(env) {
  return {
    loyalty: {
      // Points awarded per ONE MAJOR currency unit (e.g. ₹1) of captured spend.
      earnPointsPerCurrencyUnit: env.LOYALTY_EARN_POINTS_PER_CURRENCY_UNIT,
      pointsExpiryDays: env.LOYALTY_POINTS_EXPIRY_DAYS,
      signupBonusPoints: env.LOYALTY_SIGNUP_BONUS_POINTS,
      // Lifetime-points thresholds; Bronze is the implicit floor (0).
      tierThresholds: {
        silver: env.LOYALTY_TIER_SILVER_POINTS,
        gold: env.LOYALTY_TIER_GOLD_POINTS,
        platinum: env.LOYALTY_TIER_PLATINUM_POINTS,
      },
      lockTtlMs: env.CUSTOMER_LOCK_TTL_MS,
    },
    referral: {
      rewardPoints: env.REFERRAL_REWARD_POINTS,
    },
    limits: {
      favoriteProducts: env.CUSTOMER_FAVORITE_PRODUCTS_LIMIT,
      timeline: env.CUSTOMER_TIMELINE_LIMIT,
    },
    cache: {
      profileTtlSeconds: env.CUSTOMER_PROFILE_CACHE_TTL_SECONDS,
      loyaltyTtlSeconds: env.CUSTOMER_LOYALTY_CACHE_TTL_SECONDS,
      rewardsTtlSeconds: env.CUSTOMER_REWARDS_CACHE_TTL_SECONDS,
    },
  };
}
