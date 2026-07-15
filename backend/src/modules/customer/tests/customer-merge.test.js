import { beforeEach, describe, expect, it } from 'vitest';

import { CustomerService } from '../services/customer.service.js';
import { CUSTOMER_EVENTS } from '../events/customer.events.js';
import { TIMELINE_EVENT } from '../constants/customer.constants.js';

import { SCOPE, FakeCustomerRepo, createFakeEventBus, fakeStore, noopLock } from './_helpers.js';

function build() {
  const customers = new FakeCustomerRepo();
  const loyalty = { ensured: [], bonuses: [], async ensureAccount(_s, id) { this.ensured.push(id); return { balance: 0 }; }, async grantBonus(ctx) { this.bonuses.push(ctx); return { created: true }; } };
  const analytics = { recomputes: [], async recomputeForCustomer(_s, c) { this.recomputes.push(c); return {}; } };
  const users = { async getUser() { return { displayName: 'Asha', email: 'asha@example.com', phone: '+91999' }; } };
  const events = createFakeEventBus();
  const service = new CustomerService({ customers, loyalty, users, store: fakeStore, lock: noopLock, analytics, eventBus: events });
  return { service, customers, loyalty, analytics, events };
}

describe('CustomerService — ensureCustomer (idempotent materialization)', () => {
  let ctx;
  beforeEach(() => { ctx = build(); });

  it('creates the customer once, snapshotting the identity profile + opening loyalty', async () => {
    const first = await ctx.service.ensureCustomer(SCOPE, 'user-1');
    expect(first.created).toBe(true);
    expect(first.customer.displayName).toBe('Asha');
    expect(ctx.loyalty.ensured).toContain(first.customerId);
    expect(ctx.events.names()).toContain(CUSTOMER_EVENTS.CUSTOMER_CREATED);
  });

  it('is idempotent — a second ensure returns the same customer, no duplicate', async () => {
    const first = await ctx.service.ensureCustomer(SCOPE, 'user-1');
    const second = await ctx.service.ensureCustomer(SCOPE, 'user-1');
    expect(second.created).toBe(false);
    expect(second.customerId).toBe(first.customerId);
    expect(ctx.customers.docs.size).toBe(1);
    expect(ctx.events.names().filter((n) => n === CUSTOMER_EVENTS.CUSTOMER_CREATED)).toHaveLength(1);
  });
});

describe('CustomerService — guest→customer merge (history-preserving, idempotent)', () => {
  let ctx;
  beforeEach(() => { ctx = build(); });

  it('links a session, records the merge, and re-projects analytics from order history', async () => {
    const res = await ctx.service.linkFromSession(SCOPE, { sessionId: 'sess-9', userId: 'user-1' });
    expect(res.created).toBe(true);
    expect(ctx.analytics.recomputes).toHaveLength(1); // history rebuilt
    const customer = await ctx.customers.findByUser(SCOPE, 'user-1');
    expect(customer.originSessionId).toBe('sess-9');
    expect(customer.timeline.some((t) => t.event === TIMELINE_EVENT.MERGED)).toBe(true);
    expect(ctx.events.names()).toContain(CUSTOMER_EVENTS.CUSTOMER_MERGED);
  });

  it('a repeated link does not create a duplicate customer', async () => {
    await ctx.service.linkFromSession(SCOPE, { sessionId: 'sess-9', userId: 'user-1' });
    await ctx.service.linkFromSession(SCOPE, { sessionId: 'sess-10', userId: 'user-1' });
    expect(ctx.customers.docs.size).toBe(1);
  });
});
