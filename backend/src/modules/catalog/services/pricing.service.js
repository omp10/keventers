import { BaseService } from '#core/service/base.service.js';

/**
 * Pricing resolution. Computes the EFFECTIVE price of a product/variant from the
 * layered pricing model (base → variant → promotional → scheduled). This is the
 * single seam future DYNAMIC pricing (branch overrides, surge, loyalty, coupons)
 * plugs into — callers (cart/order/QR) ask the pricing service, never read the
 * raw `pricing` block themselves. Pure + deterministic (accepts an explicit
 * `now` so it is trivially testable and resume-safe).
 */
export class PricingService extends BaseService {
  constructor({ eventBus } = {}) {
    super({ name: 'catalog.pricing', eventBus });
  }

  /**
   * Resolve the effective unit price for a product (optionally a variant).
   * @param {object} product  Product DTO/doc with a `pricing` block.
   * @param {object} [options]
   * @param {object} [options.variant]  Variant DTO/doc (its price wins over base).
   * @param {Date}   [options.now]      Evaluation time (defaults handled by caller).
   * @returns {{ price: number, basePrice: number, source: string, compareAtPrice: number|null }}
   */
  resolvePrice(product, { variant = null, now = null } = {}) {
    const pricing = product?.pricing ?? {};
    const basePrice = variant?.price ?? pricing.basePrice ?? 0;
    const compareAtPrice = variant?.compareAtPrice ?? pricing.compareAtPrice ?? null;

    // 1) Scheduled promotional pricing takes precedence within its window.
    const scheduled = this.#activeScheduledPrice(pricing.scheduled, now);
    if (scheduled != null) {
      return { price: scheduled, basePrice, source: 'scheduled', compareAtPrice };
    }

    // 2) Standing promotional price.
    if (pricing.promotionalPrice != null && pricing.promotionalPrice < basePrice) {
      return { price: pricing.promotionalPrice, basePrice, source: 'promotional', compareAtPrice };
    }

    // 3) Base (or variant) price.
    return { price: basePrice, basePrice, source: variant ? 'variant' : 'base', compareAtPrice };
  }

  /** Lowest active scheduled price whose window contains `now` (or null). */
  #activeScheduledPrice(scheduled = [], now = null) {
    if (!Array.isArray(scheduled) || scheduled.length === 0) return null;
    const at = now ? new Date(now).getTime() : null;
    let best = null;
    for (const rule of scheduled) {
      if (at != null) {
        if (rule.startDate && at < new Date(rule.startDate).getTime()) continue;
        if (rule.endDate && at > new Date(rule.endDate).getTime()) continue;
      }
      if (best == null || rule.price < best) best = rule.price;
    }
    return best;
  }
}

export const pricingService = new PricingService();
export default pricingService;
