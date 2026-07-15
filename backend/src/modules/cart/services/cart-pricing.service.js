import { BaseService } from '#core/service/base.service.js';
import {
  Money,
  SERVICE_CHARGE_TYPE,
  TAX_MODE,
  pricingEngine,
  toPricingBreakdownDTO,
} from '#modules/pricing/index.js';

/**
 * Cart ↔ Pricing Engine bridge. Translates a cart's frozen item snapshots +
 * the restaurant's tax / service-charge / rounding configuration + an applied
 * coupon into a PricingEngine request, then serializes the breakdown. The cart
 * NEVER computes money itself — this bridge only shapes the request and defers
 * all arithmetic to the single source of truth.
 */
export class CartPricingService extends BaseService {
  constructor({ engine = pricingEngine, eventBus } = {}) {
    super({ name: 'cart.pricing', eventBus });
    this.engine = engine;
  }

  /** Restaurant tax config → engine tax config (percent → basis points). */
  #taxConfig(restaurant) {
    const t = restaurant?.settings?.tax ?? {};
    const mode = t.inclusive ? TAX_MODE.INCLUSIVE : TAX_MODE.EXCLUSIVE;
    const rates =
      t.enabled === false
        ? []
        : (t.rates ?? [])
            .filter((r) => Number(r.percentage) > 0)
            .map((r) => ({ name: r.name ?? 'Tax', bps: Math.round(Number(r.percentage) * 100) }));
    return { mode, rates, taxServiceCharge: true };
  }

  /** Restaurant service-charge config (optional; forward-compatible). */
  #serviceChargeConfig(restaurant, currency) {
    const sc = restaurant?.settings?.serviceCharge;
    if (!sc || sc.enabled === false || !(sc.value ?? sc.amount ?? sc.percentage)) return null;
    if (sc.type === SERVICE_CHARGE_TYPE.FIXED) {
      const minor = sc.value != null ? Math.trunc(sc.value) : Money.fromMajor(sc.amount ?? 0, currency).amount;
      return { type: SERVICE_CHARGE_TYPE.FIXED, value: minor };
    }
    const bps = sc.value != null ? Math.trunc(sc.value) : Math.round(Number(sc.percentage ?? 0) * 100);
    return { type: SERVICE_CHARGE_TYPE.PERCENTAGE, value: bps };
  }

  /** Build the engine request from a cart + restaurant + coupon snapshot. */
  buildRequest(cart, restaurant, couponSnapshot = null, now = new Date()) {
    const currency = cart.currency ?? 'INR';
    return {
      currency,
      items: (cart.items ?? []).map((it) => ({
        reference: String(it._id ?? it.id),
        productId: String(it.productId),
        quantity: it.quantity,
        components: {
          base: it.pricing?.base ?? 0,
          variant: it.pricing?.variant ?? 0,
          modifiers: (it.modifiers ?? []).map((m) => m.unitPrice ?? 0),
          addons: (it.addons ?? []).map((a) => a.unitPrice ?? 0),
        },
      })),
      discounts: [], // product promos are already baked into snapshots; menu/restaurant = future
      coupon: couponSnapshot,
      tax: this.#taxConfig(restaurant),
      serviceCharge: this.#serviceChargeConfig(restaurant, currency),
      charges: {}, // delivery/packaging/platform — future extension points (0)
      rounding: { step: restaurant?.settings?.rounding?.step ?? 1 },
      now,
    };
  }

  /** Compute the full pricing breakdown DTO for a cart. */
  compute(cart, restaurant, couponSnapshot = null, now = new Date()) {
    const breakdown = this.engine.calculate(this.buildRequest(cart, restaurant, couponSnapshot, now));
    return toPricingBreakdownDTO(breakdown);
  }
}

export const cartPricingService = new CartPricingService();
export default cartPricingService;
