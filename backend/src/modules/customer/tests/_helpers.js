import { randomUUID } from 'node:crypto';

import { buildTenantContext } from '#modules/organization/index.js';

import { LOYALTY_TIER } from '../constants/customer.constants.js';

/**
 * Customer Platform test doubles. In-memory repositories that mirror the real
 * contracts — the unique (customer, source) ledger idempotency, atomic account
 * deltas, and order-history reads — so services run with zero I/O.
 */

export const SCOPE = Object.freeze({ organizationId: 'org1', restaurantId: 'rest1' });

export const CUSTOMER_SCOPE = Object.freeze({
  organizationId: 'org1',
  restaurantId: 'rest1',
  branchId: 'br1',
  sessionId: 'sess-1',
  userId: 'user-1',
});

export function staffTenant(role = 'restaurant_manager', org = 'org1', rest = 'rest1') {
  return buildTenantContext({
    principal: { id: 'staff-1', roles: [role] },
    memberships: [{ organizationId: org, restaurantId: rest, isOwner: true }],
  });
}

export const LOYALTY_CONFIG = Object.freeze({
  earnPointsPerCurrencyUnit: 1,
  pointsExpiryDays: 365,
  signupBonusPoints: 0,
  tierThresholds: { silver: 1000, gold: 5000, platinum: 15000 },
  lockTtlMs: 8000,
});

export const noopLock = { withLock: async (_res, fn) => fn() };

export function createFakeEventBus() {
  return {
    published: [],
    async publish(e) { this.published.push(e); },
    async publishMany(events = []) { for (const e of events) this.published.push(e); },
    subscribe() {},
    names() { return this.published.map((e) => e.name); },
  };
}

export const fakeStore = {
  async getProfile() { return null; },
  async setProfile() {},
  async invalidateProfile() {},
  async getLoyalty() { return null; },
  async setLoyalty() {},
  async invalidateLoyalty() {},
  async getRewards() { return null; },
  async setRewards() {},
  async invalidateRewards() {},
};

/** In-memory loyalty account repo (atomic-ish delta + ensure). */
export class FakeAccountRepo {
  constructor() { this.byCustomer = new Map(); }
  async ensureForCustomer(scope, customerId, userId) {
    const key = String(customerId);
    if (!this.byCustomer.has(key)) {
      this.byCustomer.set(key, { _id: randomUUID(), customerId: key, userId, organizationId: scope.organizationId, restaurantId: scope.restaurantId, balance: 0, lifetimePoints: 0, redeemedPoints: 0, expiredPoints: 0, tier: LOYALTY_TIER.BRONZE, version: 0 });
    }
    return { ...this.byCustomer.get(key) };
  }
  async findByCustomer(customerId) {
    const d = this.byCustomer.get(String(customerId));
    return d ? { ...d } : null;
  }
  async applyDelta(customerId, inc = {}, set = {}) {
    const d = this.byCustomer.get(String(customerId));
    if (!d) return null;
    for (const [k, v] of Object.entries(inc)) d[k] = (d[k] ?? 0) + v;
    Object.assign(d, set);
    d.version += 1;
    return { ...d };
  }
  async rebuild(customerId, snapshot) {
    const d = this.byCustomer.get(String(customerId));
    Object.assign(d, snapshot);
    d.version += 1;
    return { ...d };
  }
}

/** In-memory immutable ledger with unique (customer, source.type, source.id). */
export class FakeLedgerRepo {
  constructor() { this.rows = []; }
  async createScoped(scope, data) {
    if (data.source?.id) {
      const dup = this.rows.find((r) => String(r.customerId) === String(data.customerId) && r.source?.type === data.source.type && r.source?.id === String(data.source.id));
      if (dup) { const e = new Error('dup'); e.code = 11000; throw e; }
    }
    const row = { _id: randomUUID(), id: undefined, organizationId: scope.organizationId, restaurantId: scope.restaurantId, createdAt: new Date(), ...data, source: data.source ? { type: data.source.type, id: data.source.id != null ? String(data.source.id) : null } : data.source };
    row.id = row._id;
    this.rows.push(row);
    return { ...row };
  }
  async findBySource(customerId, sourceType, sourceId) {
    const r = this.rows.find((x) => String(x.customerId) === String(customerId) && x.source?.type === sourceType && x.source?.id === String(sourceId));
    return r ? { ...r } : null;
  }
  async findByCustomer(customerId) { return this.rows.filter((r) => String(r.customerId) === String(customerId)).map((r) => ({ ...r })); }
  async computeBalance(customerId) { return this.rows.filter((r) => String(r.customerId) === String(customerId)).reduce((s, r) => s + r.points, 0); }
  async computeSnapshot(customerId) {
    const rows = this.rows.filter((r) => String(r.customerId) === String(customerId));
    const sum = (t) => rows.filter((r) => r.type === t).reduce((s, r) => s + r.points, 0);
    return { balance: rows.reduce((s, r) => s + r.points, 0), lifetimePoints: sum('earn') + sum('bonus'), redeemedPoints: Math.abs(sum('redeem')), expiredPoints: Math.abs(sum('expire')) };
  }
  async findExpiryCandidates(now) {
    return this.rows.filter((r) => ['earn', 'bonus'].includes(r.type) && r.expiresAt && new Date(r.expiresAt) <= now).map((r) => ({ ...r }));
  }
  async paginateForCustomer(customerId, { pagination = {} } = {}) {
    const items = this.rows.filter((r) => String(r.customerId) === String(customerId)).map((r) => ({ ...r }));
    return { items, meta: { page: pagination.page ?? 1, limit: pagination.limit ?? 20, total: items.length, totalPages: 1 } };
  }
}

/** Minimal customer repo double (timeline + stats projection + upsert). */
export class FakeCustomerRepo {
  constructor() { this.docs = new Map(); }
  _seed(customer) { this.docs.set(String(customer._id), { version: 0, stats: {}, timeline: [], ...customer }); return this.docs.get(String(customer._id)); }
  async findById(id) { const d = this.docs.get(String(id)); return d ? { ...d } : null; }
  async findByUser(scope, userId) {
    for (const d of this.docs.values()) if (String(d.userId) === String(userId) && String(d.restaurantId) === String(scope.restaurantId)) return { ...d };
    return null;
  }
  async upsertForUser(scope, userId, onInsert = {}) {
    const existing = await this.findByUser(scope, userId);
    if (existing) return { customer: existing, created: false };
    const _id = randomUUID();
    const doc = this._seed({ _id, id: _id, organizationId: scope.organizationId, restaurantId: scope.restaurantId, userId, accountStatus: 'active', stats: {}, timeline: [], ...onInsert });
    return { customer: { ...doc }, created: true };
  }
  async updateById(id, patch) { const d = this.docs.get(String(id)); if (!d) return null; Object.assign(d, patch); return { ...d }; }
  async pushTimeline(id, entry) { const d = this.docs.get(String(id)); if (!d) return null; d.timeline = [...(d.timeline ?? []), entry]; return { ...d }; }
  async incStats(id, inc = {}, set = {}) {
    const d = this.docs.get(String(id)); if (!d) return null;
    d.stats = { ...d.stats };
    for (const [k, v] of Object.entries(inc)) d.stats[k] = (d.stats[k] ?? 0) + v;
    Object.assign(d.stats, set);
    return { ...d };
  }
  async setStats(id, stats) { const d = this.docs.get(String(id)); if (!d) return null; d.stats = stats; return { ...d }; }
  async bumpFavoriteProducts(id, items = [], limit = 10) {
    const d = this.docs.get(String(id)); if (!d) return null;
    const map = new Map((d.stats.favoriteProducts ?? []).map((f) => [String(f.productId), { ...f }]));
    for (const it of items) { if (!it.productId) continue; const k = String(it.productId); const cur = map.get(k) ?? { productId: it.productId, name: it.name, orderedCount: 0 }; cur.orderedCount += it.quantity ?? 1; map.set(k, cur); }
    d.stats.favoriteProducts = [...map.values()].sort((a, b) => b.orderedCount - a.orderedCount).slice(0, limit);
    return { ...d };
  }
  async paginateForStaff(_scope, { pagination = {} } = {}) {
    const items = [...this.docs.values()].map((d) => ({ ...d }));
    return { items, meta: { page: pagination.page ?? 1, limit: pagination.limit ?? 20, total: items.length, totalPages: 1 } };
  }
}
