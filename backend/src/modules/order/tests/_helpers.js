import { randomUUID } from 'node:crypto';

/** In-memory order repository double: unique cartId, optimistic-version writes,
 * atomic timeline push and item `_id` stamping — no MongoDB needed. */
export class FakeOrderRepo {
  constructor() {
    this.docs = new Map();
  }

  #stampItems(items = []) {
    return items.map((it) => ({ ...it, _id: it._id ?? randomUUID() }));
  }

  async create(data) {
    for (const d of this.docs.values()) {
      if (String(d.cartId) === String(data.cartId)) {
        const err = new Error('duplicate cartId');
        err.code = 11000;
        throw err;
      }
    }
    const _id = randomUUID();
    const doc = { _id, createdAt: new Date(), ...data, items: this.#stampItems(data.items ?? []) };
    this.docs.set(_id, doc);
    return { ...doc };
  }

  async findById(id) {
    const doc = this.docs.get(String(id));
    return doc ? { ...doc } : null;
  }

  async findByCartId(cartId) {
    for (const d of this.docs.values()) if (String(d.cartId) === String(cartId)) return { ...d };
    return null;
  }

  async findLatestBySession(sessionId) {
    const list = [...this.docs.values()].filter((d) => d.sessionId === sessionId);
    return list.length ? { ...list[list.length - 1] } : null;
  }

  async transitionWithVersion(id, expectedVersion, { set = {}, timelineEntry }) {
    const doc = this.docs.get(String(id));
    if (!doc || doc.version !== expectedVersion) return null;
    const next = { ...doc, ...set, version: doc.version + 1, timeline: [...(doc.timeline ?? [])] };
    if (timelineEntry) next.timeline.push(timelineEntry);
    this.docs.set(String(id), next);
    return { ...next };
  }

  async updateById(id, patch) {
    const doc = this.docs.get(String(id));
    if (!doc) return null;
    const next = { ...doc, ...patch };
    this.docs.set(String(id), next);
    return { ...next };
  }

  async addNote(id, note) {
    const doc = this.docs.get(String(id));
    if (!doc) return null;
    const next = { ...doc, notes: [...(doc.notes ?? []), { ...note, _id: randomUUID() }] };
    this.docs.set(String(id), next);
    return { ...next };
  }

  async paginateForSession(sessionId, { filter = {} } = {}) {
    const items = [...this.docs.values()].filter(
      (d) => d.sessionId === sessionId && (!filter.status || d.status === filter.status),
    );
    return { items: items.map((d) => ({ ...d })), meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } };
  }

  async paginateForStaff(scope, { filter = {} } = {}) {
    const items = [...this.docs.values()].filter(
      (d) => String(d.restaurantId) === scope.restaurantId && (!filter.status || d.status === filter.status),
    );
    return { items: items.map((d) => ({ ...d })), meta: { page: 1, limit: 20, total: items.length, totalPages: 1 } };
  }

  async linkCustomerBySession(sessionId, customerUserId) {
    let modifiedCount = 0;
    for (const [k, d] of this.docs) {
      if (d.sessionId === sessionId) {
        this.docs.set(k, { ...d, customerUserId });
        modifiedCount += 1;
      }
    }
    return { modifiedCount };
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
    async del(id) {
      return map.delete(id) ? 1 : 0;
    },
  };
}

export function createFakeIdempotency() {
  const map = new Map();
  return {
    map,
    async get(sessionId, key) {
      return key ? (map.get(`${sessionId}:${key}`) ?? null) : null;
    },
    async set(sessionId, key, result) {
      if (key) map.set(`${sessionId}:${key}`, result);
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

export const GUEST_SCOPE = {
  organizationId: 'org1',
  restaurantId: 'rest1',
  branchId: 'br1',
  sessionId: 'sess-1',
  guestId: 'guest-1',
  tableId: 'tbl-1',
  customerUserId: null,
};

/** A locked cart DTO ready to become an order (as cartService.lockForCheckout returns). */
export function makeCart(over = {}) {
  return {
    id: 'cart-1',
    status: 'active',
    currency: 'INR',
    coupon: null,
    items: [
      {
        id: 'ci-1',
        productId: 'prod-1',
        product: { name: 'Burger', slug: 'burger', sku: null, thumbnailUrl: null, categoryId: null },
        variantId: null,
        variant: { name: '' },
        modifiers: [],
        addons: [],
        quantity: 2,
        specialInstructions: '',
        notes: '',
        pricing: { currency: 'INR', base: 20000, variant: 0, modifiersTotal: 0, addonsTotal: 0, unitPrice: 20000 },
        lineSubtotal: 40000,
      },
    ],
    pricing: {
      currency: 'INR',
      subtotal: { amount: 40000, currency: 'INR', major: 400 },
      total: { amount: 42000, currency: 'INR', major: 420 },
      tax: { total: { amount: 2000, currency: 'INR', major: 20 } },
    },
    ...over,
  };
}

export function createFakeCart(cart = makeCart()) {
  return {
    converted: [],
    _cart: cart,
    async getCheckoutCart() {
      return this._cart;
    },
    async lockForCheckout() {
      this._cart = { ...this._cart, status: 'locked' };
      return this._cart;
    },
    async convertToOrder(cartId, orderId) {
      this.converted.push({ cartId, orderId });
      this._cart = { ...this._cart, status: 'converted_to_order' };
      return { converted: true };
    },
  };
}

export const RESTAURANT = {
  id: 'rest1',
  name: 'Keventers',
  slug: 'keventers',
  type: 'qsr',
  settings: { currency: 'INR', timezone: 'UTC', tax: { rates: [] }, branding: {} },
};
export const BRANCH = { id: 'br1', name: 'CP', address: { city: 'Delhi' } };

export function buildService(OrderService, overrides = {}) {
  const orders = new FakeOrderRepo();
  const events = createFakeEventBus();
  const service = new OrderService({
    orders,
    carts: createFakeCart(),
    numbers: { generate: async () => 'KEV-DIN-20260715-000001' },
    realtime: { emit() {} },
    cache: createFakeStore(),
    idempotency: createFakeIdempotency(),
    lock: noopLock,
    restaurants: { getPublicProfile: async () => RESTAURANT },
    branches: { getPublicById: async () => BRANCH },
    sessions: { getPublicSession: async () => ({ status: 'active', identityType: 'anonymous' }) },
    notifications: { send: async () => ({ success: true }) },
    eventBus: events,
    ...overrides,
  });
  return { service, orders, events, carts: service.carts };
}
