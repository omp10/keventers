import { randomUUID } from 'node:crypto';

import { buildTenantContext } from '#modules/organization/index.js';

import { PAYMENT_STATUS, REFUND_STATUS } from '../constants/payment.constants.js';

/**
 * Payment test doubles. In-memory repositories that mirror the real repos'
 * contracts (scoped create, optimistic version, provider-ref lookups, settled
 * sums) and a config-service double whose `resolveProvider` returns a
 * programmable adapter — so services can be exercised with zero I/O.
 */

export const GUEST_SCOPE = Object.freeze({
  organizationId: 'org1',
  restaurantId: 'rest1',
  branchId: 'br1',
  sessionId: 'sess-1',
  customerUserId: null,
});

export function staffTenant(role = 'restaurant_manager', org = 'org1', rest = 'rest1') {
  return buildTenantContext({
    principal: { id: 'staff-1', roles: [role] },
    memberships: [{ organizationId: org, restaurantId: rest, isOwner: true }],
  });
}

/** An order as `orderService.getByIdSystem` returns it (Pricing snapshot total). */
export function makeOrder(over = {}) {
  return {
    id: 'order-1',
    _id: 'order-1',
    orderNumber: 'KEV-DIN-20260715-000001',
    organizationId: 'org1',
    restaurantId: 'rest1',
    branchId: 'br1',
    sessionId: 'sess-1',
    customerUserId: null,
    status: 'confirmed',
    currency: 'INR',
    pricing: { total: { amount: 100000, currency: 'INR' } }, // ₹1000.00
    ...over,
  };
}

/** Generic in-memory scoped repository. */
export class FakeRepo {
  constructor() {
    this.docs = new Map();
  }

  _put(doc) {
    this.docs.set(String(doc._id), doc);
    return { ...doc };
  }

  async createScoped(scope, data) {
    const _id = randomUUID();
    return this._put({
      _id,
      id: _id,
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      branchId: scope.branchId,
      version: 0,
      ...data,
    });
  }

  async create(data) {
    const _id = data._id ?? randomUUID();
    return this._put({ _id, id: _id, version: 0, ...data });
  }

  async findById(id) {
    const d = this.docs.get(String(id));
    return d ? { ...d } : null;
  }

  async find(filter = {}) {
    return [...this.docs.values()]
      .filter((d) => this._matches(d, filter))
      .map((d) => ({ ...d }));
  }

  _matches(d, filter) {
    for (const [k, v] of Object.entries(filter)) {
      if (v && typeof v === 'object' && Array.isArray(v.$in)) {
        if (!v.$in.includes(d[k])) return false;
      } else if (String(d[k]) !== String(v)) {
        return false;
      }
    }
    return true;
  }

  async updateById(id, patch) {
    const d = this.docs.get(String(id));
    if (!d) return null;
    return this._put({ ...d, ...patch });
  }

  async updateWithVersion(id, expectedVersion, patch, opts = {}) {
    const d = this.docs.get(String(id));
    if (!d || d.version !== expectedVersion) return null;
    const next = { ...d, ...patch, version: d.version + 1 };
    if (opts.push) {
      for (const [k, v] of Object.entries(opts.push)) next[k] = [...(d[k] ?? []), v];
    }
    return this._put(next);
  }

  async paginateForStaff(_scope, { pagination = {} } = {}) {
    const items = [...this.docs.values()].map((d) => ({ ...d }));
    return { items, meta: { page: pagination.page ?? 1, limit: pagination.limit ?? 20, total: items.length, totalPages: 1 } };
  }
}

/** Payment repo double: provider-ref lookup + settled-sum aggregate. */
export class FakePaymentRepo extends FakeRepo {
  async findByProviderRef(ref) {
    if (!ref) return null;
    for (const d of this.docs.values()) if (d.providerPaymentRef === ref) return { ...d };
    return null;
  }

  async sumSettledForOrder(orderId) {
    let sum = 0;
    for (const d of this.docs.values()) {
      if (String(d.orderId) === String(orderId) && [PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.PARTIALLY_REFUNDED, PAYMENT_STATUS.REFUNDED].includes(d.status)) {
        sum += d.amount;
      }
    }
    return sum;
  }
}

export class FakeIntentRepo extends FakeRepo {
  async findByOrderAndKey(orderId, key) {
    if (!key) return null;
    for (const d of this.docs.values()) if (String(d.orderId) === String(orderId) && d.idempotencyKey === key) return { ...d };
    return null;
  }

  async findByProviderRef(ref) {
    if (!ref) return null;
    for (const d of this.docs.values()) if (d.providerIntentRef === ref) return { ...d };
    return null;
  }
}

export class FakeRefundRepo extends FakeRepo {
  async findByPaymentAndKey(paymentId, key) {
    if (!key) return null;
    for (const d of this.docs.values()) if (String(d.paymentId) === String(paymentId) && d.idempotencyKey === key) return { ...d };
    return null;
  }

  async sumActiveForPayment(paymentId) {
    let sum = 0;
    for (const d of this.docs.values()) {
      if (String(d.paymentId) === String(paymentId) && [REFUND_STATUS.REQUESTED, REFUND_STATUS.PROCESSING, REFUND_STATUS.COMPLETED].includes(d.status)) {
        sum += d.amount;
      }
    }
    return sum;
  }
}

export class FakeWebhookRepo extends FakeRepo {
  async findByProviderEvent(provider, eventId) {
    for (const d of this.docs.values()) if (d.provider === provider && d.eventId === eventId) return { ...d };
    return null;
  }

  async markProcessed(id, patch) {
    return this.updateById(id, patch);
  }
}

/** No-op distributed lock: runs the critical section inline. */
export const noopLock = { withLock: async (_res, fn) => fn() };

/** Event bus spy. */
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

/** Redis store double (idempotency + webhook claim + session). */
export function createFakeStore() {
  return {
    idem: new Map(),
    claimed: new Set(),
    sessions: new Map(),
    async getIdempotent(orderId, key) { return this.idem.get(`${orderId}:${key}`) ?? null; },
    async setIdempotent(orderId, key, val) { this.idem.set(`${orderId}:${key}`, val); },
    async claimWebhook(provider, eventId) { const k = `${provider}:${eventId}`; if (this.claimed.has(k)) return false; this.claimed.add(k); return true; },
    async releaseWebhook() {},
    async saveSession(id, val) { this.sessions.set(id, val); },
    async getSession(id) { return this.sessions.get(id) ?? null; },
    async delSession(id) { this.sessions.delete(id); },
  };
}

/** Transaction-service double that appends to an in-memory ledger. */
export function createFakeTransactionService() {
  return {
    ledger: [],
    async record(_scope, data) { const t = { id: randomUUID(), ...data }; this.ledger.push(t); return t; },
    byType(type) { return this.ledger.filter((t) => t.type === type); },
  };
}

/**
 * A programmable provider adapter — the shape `resolveProvider` returns. Records
 * calls; behaviours (capture result, refund status) are configurable per test.
 */
export function createStubAdapter(over = {}) {
  return {
    calls: { capture: [], refund: [], createIntent: [] },
    supportedMethods() { return ['upi', 'credit_card', 'debit_card', 'net_banking', 'wallet']; },
    async createPaymentIntent(args) { this.calls.createIntent.push(args); return { providerIntentRef: 'prov-intent-1', checkoutPayload: { provider: 'stub' }, raw: {} }; },
    verifyPayment: over.verifyPayment ?? (() => ({ valid: true, providerPaymentRef: 'pay-ref-1', status: 'authorized' })),
    async capturePayment(args) { this.calls.capture.push(args); return over.capture ?? { captured: true, providerTxnRef: 'cap-1' }; },
    async refundPayment(args) { this.calls.refund.push(args); return over.refund ?? { providerRefundRef: 'rfnd-1', status: 'completed' }; },
    verifyWebhook: over.verifyWebhook ?? (() => ({ valid: true })),
    ...over.methods,
  };
}

/** Config-service double: resolveProvider yields the stub adapter + a config. */
export function createFakeConfigService(adapter, config = {}) {
  return {
    adapter,
    async resolveProvider() {
      return { provider: this.adapter, config: { provider: 'razorpay', enabledMethods: [], ...config } };
    },
  };
}
