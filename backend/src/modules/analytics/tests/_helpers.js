export const SCOPE = Object.freeze({ organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' });

export function createFakeEventBus() {
  return {
    published: [],
    async publish(e) { this.published.push(e); },
    subscribe() {},
    names() { return this.published.map((e) => e.name); },
  };
}

/** In-memory TimeBucket repo mirroring atomic increment + range reads. */
export class FakeBucketRepo {
  constructor() { this.docs = new Map(); }
  #k(scope, domain, period, periodKey) { return [scope.organizationId, scope.restaurantId, scope.branchId ?? null, domain, period, periodKey].join('|'); }
  async increment(scope, domain, period, periodKey, inc = {}, hist = null) {
    const key = this.#k(scope, domain, period, periodKey);
    const doc = this.docs.get(key) ?? { organizationId: scope.organizationId, restaurantId: scope.restaurantId, branchId: scope.branchId ?? null, domain, period, periodKey, metrics: {}, hourly: undefined, weekday: undefined };
    for (const [m, v] of Object.entries(inc)) if (v) doc.metrics[m] = (doc.metrics[m] ?? 0) + v;
    if (hist?.hourly) { doc.hourly = doc.hourly ?? new Array(24).fill(0); doc.hourly[hist.hourly.idx] += hist.hourly.by ?? 1; }
    if (hist?.weekday) { doc.weekday = doc.weekday ?? new Array(7).fill(0); doc.weekday[hist.weekday.idx] += hist.weekday.by ?? 1; }
    this.docs.set(key, doc);
    return { ...doc };
  }
  async findBucket(scope, domain, period, periodKey) { const d = this.docs.get(this.#k(scope, domain, period, periodKey)); return d ? { ...d } : null; }
  async findRange(scope, domain, period, fromKey, toKey) {
    return [...this.docs.values()].filter((d) => d.domain === domain && d.period === period && d.periodKey >= fromKey && d.periodKey <= toKey && String(d.restaurantId) === String(scope.restaurantId)).sort((a, b) => a.periodKey.localeCompare(b.periodKey));
  }
  async sumRange(scope, domain, period, fromKey, toKey) {
    const rows = await this.findRange(scope, domain, period, fromKey, toKey);
    const summed = {};
    for (const r of rows) for (const [k, v] of Object.entries(r.metrics)) summed[k] = (summed[k] ?? 0) + v;
    return summed;
  }
  async deleteDomain(scope, domain) { for (const [k, d] of this.docs) if (d.domain === domain && String(d.restaurantId) === String(scope.restaurantId)) this.docs.delete(k); }
  countFor(domain, period) { return [...this.docs.values()].filter((d) => d.domain === domain && d.period === period).length; }
}

/** In-memory Entity repo. */
export class FakeEntityRepo {
  constructor() { this.docs = new Map(); }
  #k(scope, domain, type, id) { return [scope.restaurantId, domain, type, id].join('|'); }
  async increment(scope, domain, entityType, entityId, inc = {}, name = null) {
    const key = this.#k(scope, domain, entityType, String(entityId));
    const doc = this.docs.get(key) ?? { organizationId: scope.organizationId, restaurantId: scope.restaurantId, branchId: scope.branchId ?? null, domain, entityType, entityId: String(entityId), name, metrics: {} };
    for (const [m, v] of Object.entries(inc)) if (v) doc.metrics[m] = (doc.metrics[m] ?? 0) + v;
    if (name) doc.name = name;
    this.docs.set(key, doc);
    return { ...doc };
  }
  async topBy(scope, domain, entityType, metricKey, { limit = 10, ascending = false } = {}) {
    return [...this.docs.values()].filter((d) => d.domain === domain && d.entityType === entityType && String(d.restaurantId) === String(scope.restaurantId))
      .sort((a, b) => (ascending ? 1 : -1) * ((b.metrics[metricKey] ?? 0) - (a.metrics[metricKey] ?? 0))).slice(0, limit);
  }
  async findByType(scope, domain, entityType) { return [...this.docs.values()].filter((d) => d.domain === domain && d.entityType === entityType); }
  async deleteForDomain(scope, domain) { for (const [k, d] of this.docs) if (d.domain === domain) this.docs.delete(k); }
}

export const fakeStore = {
  async invalidateRestaurant() {},
  async getKpi() { return null; },
  async setKpi() {},
  async recordPreparing() {},
  async takePreparing() { return null; },
  async recordSessionStart() {},
  async takeSessionStart() { return null; },
};
