import { randomUUID } from 'node:crypto';

/**
 * In-memory cart repository double implementing the CartRepository surface,
 * including optimistic-version conditional writes and Mongoose-like embedded
 * item `_id` stamping, so the cart service can be unit-tested without MongoDB.
 */
export class FakeCartRepo {
  constructor() {
    this.docs = new Map();
  }

  #stampItems(items = []) {
    return items.map((it) => ({ ...it, _id: it._id ?? randomUUID() }));
  }

  #scopeMatch(doc, scope) {
    return (
      String(doc.organizationId) === scope.organizationId &&
      String(doc.restaurantId) === scope.restaurantId &&
      String(doc.branchId) === scope.branchId &&
      String(doc.sessionId) === scope.sessionId
    );
  }

  async createScoped(scope, data) {
    const _id = randomUUID();
    const doc = {
      _id,
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      branchId: scope.branchId,
      sessionId: scope.sessionId,
      ...data,
      items: this.#stampItems(data.items ?? []),
    };
    this.docs.set(_id, doc);
    return { ...doc };
  }

  async findActiveBySession(scope) {
    for (const doc of this.docs.values()) {
      if (this.#scopeMatch(doc, scope) && doc.status === 'active') return { ...doc };
    }
    return null;
  }

  async findActiveBySessionId(sessionId) {
    for (const doc of this.docs.values()) {
      if (String(doc.sessionId) === String(sessionId) && doc.status === 'active') return { ...doc };
    }
    return null;
  }

  async findByIdForSession(scope, id) {
    const doc = this.docs.get(String(id));
    return doc && this.#scopeMatch(doc, scope) ? { ...doc } : null;
  }

  async findById(id) {
    const doc = this.docs.get(String(id));
    return doc ? { ...doc } : null;
  }

  async updateWithVersion(id, expectedVersion, patch) {
    const doc = this.docs.get(String(id));
    if (!doc || doc.version !== expectedVersion) return null;
    const next = { ...doc, ...patch, version: doc.version + 1 };
    if (patch.items) next.items = this.#stampItems(patch.items);
    this.docs.set(String(id), next);
    return { ...next };
  }

  async updateById(id, patch) {
    const doc = this.docs.get(String(id));
    if (!doc) return null;
    const next = { ...doc, ...patch };
    if (patch.items) next.items = this.#stampItems(patch.items);
    this.docs.set(String(id), next);
    return { ...next };
  }

  async findStaleForExpiry(now, limit = 100) {
    return [...this.docs.values()]
      .filter((d) => d.status === 'active' && new Date(d.expiresAt).getTime() <= now.getTime())
      .slice(0, limit)
      .map((d) => ({ ...d }));
  }
}

export const noopLock = { withLock: async (_res, fn) => fn() };

export function createFakeStore() {
  const map = new Map();
  return {
    map,
    async save(id, snap) {
      map.set(id, snap);
    },
    async get(id) {
      return map.get(id) ?? null;
    },
    async touch() {
      return 1;
    },
    async del(id) {
      return map.delete(id) ? 1 : 0;
    },
  };
}

export function createFakeIdempotency() {
  const map = new Map();
  return {
    map,
    async get(cartId, key) {
      return key ? (map.get(`${cartId}:${key}`) ?? null) : null;
    },
    async set(cartId, key, result) {
      if (key) map.set(`${cartId}:${key}`, result);
    },
  };
}

export function createFakeEventBus() {
  return {
    published: [],
    async publish(e) {
      this.published.push(e);
    },
    async publishMany(events = []) {
      for (const e of events) this.published.push(e);
    },
    subscribe() {},
    names() {
      return this.published.map((e) => e.name);
    },
  };
}

/** A restaurant with exclusive 5% GST configured. */
export const RESTAURANT = {
  id: 'rest1',
  status: 'active',
  settings: {
    currency: 'INR',
    timezone: 'UTC',
    tax: { enabled: true, inclusive: false, rates: [{ name: 'GST', percentage: 5 }] },
  },
};

export const GUEST_SCOPE = {
  organizationId: 'org1',
  restaurantId: 'rest1',
  branchId: 'br1',
  sessionId: 'sess-1',
  guestId: 'guest-1',
  tableId: 'tbl-1',
  customerUserId: null,
};

/** Fake validation service: context always valid; resolveItem returns a priced snapshot. */
export function createFakeValidation() {
  return {
    restaurants: { getPublicProfile: async () => RESTAURANT },
    async validateOrderingContext() {
      return { restaurant: RESTAURANT, branch: { id: 'br1', status: 'active' } };
    },
    async resolveItem(_scope, input, currency) {
      const unit = 20000; // ₹200 in paise
      return {
        productId: input.productId,
        productSnapshot: { name: 'Burger', slug: 'burger', sku: null, thumbnailUrl: null, categoryId: null },
        variantId: null,
        variantSnapshot: { name: '' },
        modifiers: [],
        addons: [],
        quantity: Math.max(1, Math.trunc(input.quantity ?? 1)),
        specialInstructions: input.specialInstructions ?? '',
        notes: input.notes ?? '',
        pricing: { currency, base: unit, variant: 0, modifiersTotal: 0, addonsTotal: 0, unitPrice: unit, capturedAt: new Date() },
        lineSubtotal: unit * Math.max(1, Math.trunc(input.quantity ?? 1)),
      };
    },
  };
}
