import { randomUUID } from 'node:crypto';

export const SCOPE = Object.freeze({ organizationId: 'org1', restaurantId: 'rest1', branchId: 'br1' });

export const NOTIFY_CONFIG = Object.freeze({
  delivery: { maxAttempts: 3, backoffMs: 1000, relayBatchSize: 200, concurrency: 5, relayCron: '*/1 * * * *', outboxStaleSeconds: 60 },
  redis: { dedupeTtlSeconds: 86400, lockTtlMs: 10000, rateLimitPerMinute: 60 },
});

export function createFakeEventBus() {
  return {
    published: [],
    async publish(e) { this.published.push(e); },
    async publishMany(events = []) { for (const e of events) this.published.push(e); },
    subscribe() {},
    names() { return this.published.map((e) => e.name); },
  };
}

/** Redis store double — everything allowed / locks acquired (degraded-safe path). */
export const fakeStore = {
  async claimDedupe() { return true; },
  async allowRate() { return true; },
  async acquireDeliveryLock() { return true; },
  async releaseDeliveryLock() {},
};

/** A store that reports a dedupe key as already-seen (replay). */
export function seenStore() {
  return { ...fakeStore, async claimDedupe() { return false; } };
}

export const fakeRealtime = { emitNew() {}, emitRead() {} };

/** In-memory notification repo double. */
export class FakeNotificationRepo {
  constructor() { this.docs = new Map(); }
  _seed(doc) { this.docs.set(String(doc._id), doc); return doc; }
  async createScoped(scope, data) {
    // Enforce the (dedupeKey, channel) unique index.
    for (const d of this.docs.values()) if (d.dedupeKey === data.dedupeKey && d.channel === data.channel) { const e = new Error('dup'); e.code = 11000; throw e; }
    const _id = randomUUID();
    const doc = { _id, id: _id, organizationId: scope.organizationId, restaurantId: scope.restaurantId, branchId: scope.branchId, attemptCount: 0, createdAt: new Date(), ...data };
    return this._seed({ ...doc });
  }
  async findById(id) { const d = this.docs.get(String(id)); return d ? { ...d } : null; }
  async updateById(id, patch) { const d = this.docs.get(String(id)); if (!d) return null; Object.assign(d, patch); return { ...d }; }
}

/** In-memory delivery-attempt repo double. */
export class FakeAttemptRepo {
  constructor() { this.rows = []; }
  async createScoped(_scope, data) { const r = { _id: randomUUID(), ...data }; this.rows.push(r); return { ...r }; }
  async findByNotification(id) { return this.rows.filter((r) => String(r.notificationId) === String(id)); }
  byStatus(s) { return this.rows.filter((r) => r.status === s); }
}

/** In-memory outbox repo double mirroring atomic claim + dedupe unique. */
export class FakeOutboxRepo {
  constructor() { this.docs = new Map(); }
  async createScoped(scope, data) {
    for (const d of this.docs.values()) if (d.dedupeKey === data.dedupeKey) { const e = new Error('dup'); e.code = 11000; throw e; }
    const _id = randomUUID();
    const doc = { _id, id: _id, organizationId: scope.organizationId, restaurantId: scope.restaurantId, branchId: scope.branchId, attempts: 0, status: data.status ?? 'pending', createdAt: new Date(), ...data };
    this.docs.set(_id, doc);
    return { ...doc };
  }
  async findByDedupe(k) { for (const d of this.docs.values()) if (d.dedupeKey === k) return { ...d }; return null; }
  async findById(id) { const d = this.docs.get(String(id)); return d ? { ...d } : null; }
  async claim(id) { const d = this.docs.get(String(id)); if (!d || d.status !== 'pending') return null; d.status = 'processing'; d.attempts += 1; return { ...d }; }
  async markDispatched(id) { const d = this.docs.get(String(id)); if (!d) return null; d.status = 'dispatched'; d.dispatchedAt = new Date(); return { ...d }; }
  async reschedule(id, at, err) { const d = this.docs.get(String(id)); if (!d) return null; d.status = 'pending'; d.nextAttemptAt = at; d.lastError = err; return { ...d }; }
  async markDead(id, err) { const d = this.docs.get(String(id)); if (!d) return null; d.status = 'dead'; d.lastError = err; return { ...d }; }
  async claimBatch() { const out = []; for (const d of this.docs.values()) if (d.status === 'pending') { d.status = 'processing'; d.attempts += 1; out.push({ ...d }); } return out; }
}
