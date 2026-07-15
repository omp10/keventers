import { BaseService } from '#core/service/base.service.js';

import { entityId } from '../utils/id.util.js';

/**
 * Station routing. Resolves which station(s) each order item is prepared at,
 * using each station's configurable routing rules (productIds → categoryIds →
 * default). Pure/deterministic and future-proof: richer routing (by tag, by
 * dietary type, load-balancing) plugs in here without touching the queue flow.
 */
export class StationRouterService extends BaseService {
  constructor({ eventBus } = {}) {
    super({ name: 'kitchen.station-router', eventBus });
  }

  /** Station ids an item routes to (most specific rule wins; else default). */
  resolveForItem(stations, item) {
    const matches = [];
    for (const s of stations) {
      const r = s.routing ?? {};
      const byProduct = (r.productIds ?? []).some((p) => String(p) === String(item.productId));
      const byCategory =
        item.categoryId && (r.categoryIds ?? []).some((c) => String(c) === String(item.categoryId));
      if (byProduct || byCategory) matches.push(entityId(s));
    }
    if (matches.length) return matches;
    const def = stations.find((s) => s.routing?.isDefault && s.isActive !== false);
    return def ? [entityId(def)] : [];
  }

  /**
   * Build kitchen line items (with station routing) from order items + the
   * branch's stations. Returns { items, stationIds } where stationIds is the
   * union of every station the order touches.
   */
  buildItems(stations, orderItems = []) {
    const union = new Set();
    const items = orderItems.map((it) => {
      const categoryId = it.product?.categoryId ?? null;
      const stationIds = this.resolveForItem(stations, { productId: it.productId, categoryId });
      stationIds.forEach((s) => union.add(s));
      const modifierNames = [
        ...(it.modifiers ?? []).map((m) => m.name),
        ...(it.addons ?? []).map((a) => a.name),
      ].filter(Boolean);
      return {
        orderItemId: it.id ?? null,
        productId: it.productId ?? null,
        name: it.product?.name ?? '',
        quantity: it.quantity ?? 1,
        variantName: it.variant?.name ?? '',
        modifiers: modifierNames,
        specialInstructions: it.specialInstructions ?? '',
        stationIds,
      };
    });
    return { items, stationIds: [...union] };
  }
}

export const stationRouterService = new StationRouterService();
export default stationRouterService;
