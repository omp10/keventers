import { branchService } from '#modules/organization/index.js';
import { logger } from '#core/logging/logger.js';

import { Product } from '../models/product.model.js';
import { UpsellRule } from '../models/upsell-rule.model.js';
import { PRODUCT_STATUS, AVAILABILITY_STATUS } from '../constants/catalog.constants.js';

/**
 * UPSELL ENGINE — recommendation without a model. Candidates are scored from:
 *
 *   1. CO-OCCURRENCE learned from this restaurant's own orders ("people who
 *      ordered X also ordered Y"), recomputed from the last 500 orders and
 *      cached in-process for 10 minutes.
 *   2. ADMIN RULES from the dashboard CMS (UpsellRule) — triggers, weights and
 *      daily time windows. Rules can pin anything above the learned signal.
 *   3. SESSION RECENCY — items this table already ordered are never suggested
 *      again this visit.
 *
 * The response is a small ranked list of full menu products, so the customer
 * UI renders it with the components it already has.
 *
 * ponytail: pair counts are computed in-process over the last 500 orders —
 * move to a scheduled projection when order volume makes the scan noticeable.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;
const ORDERS_WINDOW = 500;
const MAX_RESULTS = 6;

class UpsellService {
  #log = logger({ module: 'catalog', component: 'upsell' });
  /** restaurantId → { at, pairs: Map<'a|b', n>, popular: Map<id, n> } */
  #cache = new Map();

  async #signals(restaurantId) {
    const hit = this.#cache.get(String(restaurantId));
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit;

    // LAZY import: a static `#modules/order` import here closes a module cycle
    // (cart → catalog → order → cart) and crashes boot with a TDZ error.
    const { orderService } = await import('#modules/order/index.js');
    const orders = await orderService.listForRestaurantSystem(String(restaurantId), { limit: ORDERS_WINDOW });
    const pairs = new Map();
    const popular = new Map();
    for (const order of orders) {
      const ids = [...new Set((order.items ?? []).map((i) => String(i.productId)))];
      for (const id of ids) popular.set(id, (popular.get(id) ?? 0) + 1);
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = 0; j < ids.length; j += 1) {
          if (i === j) continue;
          const key = `${ids[i]}|${ids[j]}`;
          pairs.set(key, (pairs.get(key) ?? 0) + 1);
        }
      }
    }
    const computed = { at: Date.now(), pairs, popular, orders: orders.length };
    this.#cache.set(String(restaurantId), computed);
    return computed;
  }

  /** Drop the learned cache (rules changed / testing). */
  invalidate(restaurantId) {
    this.#cache.delete(String(restaurantId));
  }

  /**
   * Recommendations for a branch given seed products (the opened product, or
   * everything in the cart). `excludeIds` = seeds + session history.
   */
  async recommend(branchSlug, { seedIds = [], excludeIds = [], limit = MAX_RESULTS } = {}) {
    const branch = await branchService.getPublicBySlug(branchSlug);
    if (!branch) return [];
    const restaurantId = String(branch.restaurantId);

    const { pairs, popular, orders } = await this.#signals(restaurantId);
    const seeds = seedIds.map(String);
    const excluded = new Set([...seeds, ...excludeIds.map(String)]);
    const scores = new Map();
    const reasons = new Map();

    // 1. Learned co-occurrence, normalized to ~0-50 by the strongest pair.
    let maxPair = 1;
    for (const seed of seeds) for (const [key, n] of pairs) if (key.startsWith(`${seed}|`)) maxPair = Math.max(maxPair, n);
    for (const seed of seeds) {
      for (const [key, n] of pairs) {
        if (!key.startsWith(`${seed}|`)) continue;
        const candidate = key.slice(seed.length + 1);
        if (excluded.has(candidate)) continue;
        const s = (n / maxPair) * 50;
        scores.set(candidate, (scores.get(candidate) ?? 0) + s);
        reasons.set(candidate, 'Frequently bought together');
      }
    }

    // 2. Popularity floor when there are no seeds (or history is thin) — the
    //    engine still answers on day one.
    if (scores.size < limit) {
      for (const [id, n] of popular) {
        if (excluded.has(id) || scores.has(id)) continue;
        scores.set(id, (n / Math.max(1, orders)) * 10);
        reasons.set(id, 'Popular right now');
      }
    }

    // 3. Admin rules — trigger match (or any), inside their time window.
    const hour = new Date().getHours();
    const rules = await UpsellRule.find({ restaurantId, isActive: true }).lean();
    for (const rule of rules) {
      const triggers = (rule.triggerProductIds ?? []).map(String);
      const fires = triggers.length === 0 || triggers.some((t) => seeds.includes(t));
      const inWindow =
        rule.startHour == null || rule.endHour == null
          ? true
          : rule.startHour <= rule.endHour
            ? hour >= rule.startHour && hour <= rule.endHour
            : hour >= rule.startHour || hour <= rule.endHour; // overnight window
      if (!fires || !inWindow) continue;
      const candidate = String(rule.suggestProductId);
      if (excluded.has(candidate)) continue;
      scores.set(candidate, (scores.get(candidate) ?? 0) + rule.weight);
      reasons.set(candidate, rule.label || 'Recommended');
    }

    if (scores.size === 0) return [];

    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit * 2);
    // Only live, available products make it out — an upsell for something the
    // kitchen can't make is worse than none.
    const products = await Product.find({
      _id: { $in: ranked.map(([id]) => id) },
      restaurantId,
      status: PRODUCT_STATUS.ACTIVE,
      'availability.status': AVAILABILITY_STATUS.AVAILABLE,
      deletedAt: null,
    }).lean({ virtuals: true });
    const byId = new Map(products.map((p) => [String(p._id), p]));

    return ranked
      .filter(([id]) => byId.has(id))
      .slice(0, limit)
      .map(([id, score]) => {
        const p = byId.get(id);
        return {
          id,
          slug: p.slug,
          name: p.name,
          imageUrl: p.heroImageUrl || p.thumbnailUrl || p.images?.[0]?.url || null,
          // Catalog stores MAJOR rupees; the wire speaks MINOR like orders do.
          price: Math.round((p.pricing?.basePrice ?? 0) * 100),
          currency: p.pricing?.currency ?? 'INR',
          reason: reasons.get(id) ?? 'Recommended',
          score: Math.round(score),
        };
      });
  }

  /* ── management CRUD ── */

  async listRules(tenant) {
    const rules = await UpsellRule.find({ restaurantId: tenant.restaurantId })
      .sort({ createdAt: -1 })
      .populate('suggestProductId', 'name')
      .populate('triggerProductIds', 'name')
      .lean({ virtuals: true });
    return rules.map((r) => ({
      ...r,
      id: String(r._id),
      suggest: r.suggestProductId ? { id: String(r.suggestProductId._id), name: r.suggestProductId.name } : null,
      triggers: (r.triggerProductIds ?? []).map((p) => ({ id: String(p._id), name: p.name })),
    }));
  }

  async createRule(tenant, data) {
    let { organizationId } = tenant;
    // Super-admin scopes by restaurantId alone — resolve the org so the rule
    // carries a valid tenant.
    if (!organizationId && tenant.restaurantId) {
      const { restaurantService } = await import('#modules/organization/index.js');
      const restaurant = await restaurantService.getPublicProfile(tenant.restaurantId);
      organizationId = restaurant?.organizationId ?? null;
    }
    const rule = await UpsellRule.create({ organizationId, restaurantId: tenant.restaurantId, ...data });
    this.invalidate(tenant.restaurantId);
    return rule.toJSON();
  }

  async updateRule(tenant, id, patch) {
    const rule = await UpsellRule.findOneAndUpdate({ _id: id, restaurantId: tenant.restaurantId }, { $set: patch }, { new: true });
    return rule ? rule.toJSON() : null;
  }

  async removeRule(tenant, id) {
    await UpsellRule.deleteOne({ _id: id, restaurantId: tenant.restaurantId });
    return { id };
  }

  /** What the engine has learned — shown in the CMS so rules aren't authored blind. */
  async learnedPairs(tenant, limit = 20) {
    const { pairs, orders } = await this.#signals(tenant.restaurantId);
    const top = [...pairs.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit * 2);
    const ids = [...new Set(top.flatMap(([k]) => k.split('|')))];
    const products = await Product.find({ _id: { $in: ids } }).select('name').lean();
    const nameOf = new Map(products.map((p) => [String(p._id), p.name]));
    const seen = new Set();
    const out = [];
    for (const [key, n] of top) {
      const [a, b] = key.split('|');
      const undirected = [a, b].sort().join('|');
      if (seen.has(undirected)) continue;
      seen.add(undirected);
      if (!nameOf.has(a) || !nameOf.has(b)) continue;
      out.push({ a: nameOf.get(a), b: nameOf.get(b), togetherCount: n, basis: orders });
      if (out.length >= limit) break;
    }
    return out;
  }
}

export const upsellService = new UpsellService();
export default upsellService;
