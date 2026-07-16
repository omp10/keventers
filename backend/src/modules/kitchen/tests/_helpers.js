import { randomUUID } from 'node:crypto';

import { buildTenantContext } from '#modules/organization/index.js';

/** Apply a $set object supporting dot-notation nested keys (timers.*, sla.*). */
function applySet(doc, set = {}) {
  const next = {
    ...doc,
    timers: { ...(doc.timers ?? {}) },
    sla: { ...(doc.sla ?? {}) },
    assignment: { ...(doc.assignment ?? {}) },
  };
  for (const [k, v] of Object.entries(set)) {
    if (k.includes('.')) {
      const [a, b] = k.split('.');
      next[a] = { ...(next[a] ?? {}), [b]: v };
    } else {
      next[k] = v;
    }
  }
  return next;
}

/** In-memory kitchen queue repo double: unique orderId, optimistic-version
 * transitions with dot-notation $set + timeline push. */
export class FakeQueueRepo {
  constructor() {
    this.docs = new Map();
  }

  async createScoped(scope, data) {
    for (const d of this.docs.values()) {
      if (String(d.orderId) === String(data.orderId)) {
        const err = new Error('dup orderId');
        err.code = 11000;
        throw err;
      }
    }
    const _id = randomUUID();
    const doc = {
      _id,
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      branchId: scope.branchId,
      version: 0,
      recallCount: 0,
      refireCount: 0,
      ...data,
    };
    this.docs.set(_id, doc);
    return { ...doc };
  }

  async findByOrderId(orderId) {
    for (const d of this.docs.values()) if (String(d.orderId) === String(orderId)) return { ...d };
    return null;
  }

  async findById(id) {
    const d = this.docs.get(String(id));
    return d ? { ...d } : null;
  }

  async transitionWithVersion(id, expectedVersion, { set = {}, timelineEntry, inc }) {
    const doc = this.docs.get(String(id));
    if (!doc || doc.version !== expectedVersion) return null;
    const next = applySet(doc, set);
    next.version = doc.version + 1;
    next.timeline = [...(doc.timeline ?? [])];
    if (timelineEntry) next.timeline.push(timelineEntry);
    if (inc) for (const [k, v] of Object.entries(inc)) next[k] = (next[k] ?? 0) + v;
    this.docs.set(String(id), next);
    return { ...next };
  }

  async markSlaBreached(id) {
    const doc = this.docs.get(String(id));
    if (!doc || doc.sla?.breached) return null;
    const next = { ...doc, sla: { ...doc.sla, breached: true, breachedAt: new Date() } };
    this.docs.set(String(id), next);
    return { ...next };
  }

  async findScoped(_scope, filter = {}) {
    const statuses = filter.status?.$in;
    return [...this.docs.values()]
      .filter((d) => (statuses ? statuses.includes(d.status) : true))
      .map((d) => ({ ...d }));
  }

  async countScoped() {
    return 0;
  }

  async findSlaCandidates() {
    return [...this.docs.values()].filter((d) => d.status === 'preparing' && !d.sla?.breached && d.sla?.targetSeconds).map((d) => ({ ...d }));
  }

  async paginateForBranch(_scope, { filter = {} } = {}) {
    const statuses = filter.status?.$in;
    const items = [...this.docs.values()].filter((d) => (statuses ? statuses.includes(d.status) : filter.status ? d.status === filter.status : true));
    return { items: items.map((d) => ({ ...d })), meta: { page: 1, limit: 50, total: items.length, totalPages: 1 } };
  }
}

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

export const fakeRealtime = { emit() {}, queueUpdated() {} };
export const fakeStore = {
  added: [], removed: [],
  async add(...a) { this.added.push(a); },
  async remove(...a) { this.removed.push(a); },
  async setPrepTimer() {},
  async delPrepTimer() {},
};

export function staffTenant(role = 'restaurant_manager', org = 'org1', rest = 'rest1') {
  return buildTenantContext({ principal: { id: 'staff-1', roles: [role] }, memberships: [{ organizationId: org, restaurantId: rest, isOwner: true }] });
}

/** An order (as orderService.getByIdSystem returns) with kitchen-relevant items. */
export function makeOrder(over = {}) {
  return {
    id: 'order-1',
    orderNumber: 'KEV-DIN-20260715-000001',
    organizationId: 'org1',
    restaurantId: 'rest1',
    branchId: 'br1',
    tableId: 'tbl-1',
    orderType: 'dine_in',
    status: 'confirmed',
    items: [
      { id: 'oi-1', productId: 'burger', product: { name: 'Burger', categoryId: 'food' }, variant: { name: '' }, modifiers: [{ name: 'Extra cheese' }], addons: [], quantity: 2, specialInstructions: 'No onion' },
    ],
    ...over,
  };
}

export const STATIONS = [
  { _id: 'grill', isActive: true, routing: { productIds: ['burger'], categoryIds: [], isDefault: false } },
  { _id: 'general', isActive: true, routing: { isDefault: true } },
];
