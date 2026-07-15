import { beforeEach, describe, expect, it } from 'vitest';

import { LoyaltyService, computeEarnPoints } from '../services/loyalty.service.js';
import { CUSTOMER_EVENTS } from '../events/customer.events.js';
import { LOYALTY_SOURCE, LOYALTY_TIER, LOYALTY_TXN_TYPE } from '../constants/customer.constants.js';

import {
  SCOPE,
  FakeAccountRepo,
  FakeCustomerRepo,
  FakeLedgerRepo,
  LOYALTY_CONFIG,
  createFakeEventBus,
  fakeStore,
  noopLock,
} from './_helpers.js';

const CUSTOMER_ID = 'cust-1';
const USER_ID = 'user-1';

function build() {
  const accounts = new FakeAccountRepo();
  const ledger = new FakeLedgerRepo();
  const customers = new FakeCustomerRepo();
  customers._seed({ _id: CUSTOMER_ID, id: CUSTOMER_ID, organizationId: 'org1', restaurantId: 'rest1', userId: USER_ID });
  const events = createFakeEventBus();
  const service = new LoyaltyService({ accounts, ledger, customers, store: fakeStore, lock: noopLock, loyaltyConfig: LOYALTY_CONFIG, eventBus: events });
  return { service, accounts, ledger, customers, events };
}

describe('computeEarnPoints', () => {
  it('converts minor-unit spend to whole points at the configured rate', () => {
    expect(computeEarnPoints(100000, 1)).toBe(1000); // ₹1000.00 → 1000 pts
    expect(computeEarnPoints(15050, 1)).toBe(150); // ₹150.50 → floor
    expect(computeEarnPoints(99, 1)).toBe(0); // < ₹1 → 0
  });
});

describe('LoyaltyService — earn (immutable ledger)', () => {
  let ctx;
  beforeEach(() => { ctx = build(); });

  it('appends a ledger entry and increments the derived balance', async () => {
    const entry = await ctx.service.earn({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 500, source: { type: LOYALTY_SOURCE.PAYMENT, id: 'pay-1' } });
    expect(entry.ledger.type).toBe(LOYALTY_TXN_TYPE.EARN);
    expect(entry.ledger.points).toBe(500);
    expect(entry.ledger.balanceAfter).toBe(500);
    expect(entry.created).toBe(true);
    const acc = await ctx.accounts.findByCustomer(CUSTOMER_ID);
    expect(acc.balance).toBe(500);
    expect(acc.lifetimePoints).toBe(500);
    expect(ctx.events.names()).toContain(CUSTOMER_EVENTS.LOYALTY_POINTS_EARNED);
  });

  it('is idempotent by source — a replayed PaymentCaptured never double-earns', async () => {
    await ctx.service.earn({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 500, source: { type: LOYALTY_SOURCE.PAYMENT, id: 'pay-1' } });
    const replay = await ctx.service.earn({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 500, source: { type: LOYALTY_SOURCE.PAYMENT, id: 'pay-1' } });
    expect(replay.created).toBe(false);
    const acc = await ctx.accounts.findByCustomer(CUSTOMER_ID);
    expect(acc.balance).toBe(500); // not 1000
    expect(ctx.ledger.rows).toHaveLength(1);
  });

  it('the balance always equals the signed sum of the ledger', async () => {
    await ctx.service.earn({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 300, source: { type: LOYALTY_SOURCE.PAYMENT, id: 'p1' } });
    await ctx.service.earn({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 200, source: { type: LOYALTY_SOURCE.PAYMENT, id: 'p2' } });
    await ctx.service.redeem({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 100, source: { type: LOYALTY_SOURCE.REWARD, id: 'r1' } });
    const acc = await ctx.accounts.findByCustomer(CUSTOMER_ID);
    expect(acc.balance).toBe(await ctx.ledger.computeBalance(CUSTOMER_ID));
    expect(acc.balance).toBe(400);
  });
});

describe('LoyaltyService — redeem', () => {
  let ctx;
  beforeEach(async () => {
    ctx = build();
    await ctx.service.earn({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 1000, source: { type: LOYALTY_SOURCE.PAYMENT, id: 'seed' } });
  });

  it('debits points and records a negative ledger entry', async () => {
    const res = await ctx.service.redeem({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 400, source: { type: LOYALTY_SOURCE.REWARD, id: 'rw-1' } });
    expect(res.dto.points).toBe(-400);
    const acc = await ctx.accounts.findByCustomer(CUSTOMER_ID);
    expect(acc.balance).toBe(600);
    expect(acc.redeemedPoints).toBe(400);
    expect(ctx.events.names()).toContain(CUSTOMER_EVENTS.LOYALTY_REDEEMED);
  });

  it('rejects redeeming more than the balance', async () => {
    await expect(ctx.service.redeem({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 5000, source: { type: LOYALTY_SOURCE.REWARD, id: 'rw-2' } })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('does not lower the tier (lifetime points unchanged by a redeem)', async () => {
    await ctx.service.redeem({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 1000, source: { type: LOYALTY_SOURCE.REWARD, id: 'rw-3' } });
    const acc = await ctx.accounts.findByCustomer(CUSTOMER_ID);
    expect(acc.balance).toBe(0);
    expect(acc.lifetimePoints).toBe(1000); // preserved
  });
});

describe('LoyaltyService — tier upgrades (event-driven)', () => {
  it('upgrades Bronze → Silver → Gold as lifetime points cross thresholds', async () => {
    const ctx = build();
    await ctx.service.earn({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 1000, source: { type: LOYALTY_SOURCE.PAYMENT, id: 'a' } });
    let acc = await ctx.accounts.findByCustomer(CUSTOMER_ID);
    expect(acc.tier).toBe(LOYALTY_TIER.SILVER);
    await ctx.service.earn({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 4000, source: { type: LOYALTY_SOURCE.PAYMENT, id: 'b' } });
    acc = await ctx.accounts.findByCustomer(CUSTOMER_ID);
    expect(acc.tier).toBe(LOYALTY_TIER.GOLD);
    expect(ctx.events.names().filter((n) => n === CUSTOMER_EVENTS.TIER_CHANGED)).toHaveLength(2);
  });
});

describe('LoyaltyService — manual adjustment', () => {
  it('applies a signed correction and audits it, never going negative', async () => {
    const ctx = build();
    await ctx.service.adjust({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 250, reason: 'goodwill' });
    let acc = await ctx.accounts.findByCustomer(CUSTOMER_ID);
    expect(acc.balance).toBe(250);
    await expect(ctx.service.adjust({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: -1000, reason: 'clawback' })).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('LoyaltyService — expiration sweep', () => {
  it('expires an aged lot exactly once, capped at the current balance', async () => {
    const ctx = build();
    await ctx.service.earn({ scope: SCOPE, customerId: CUSTOMER_ID, userId: USER_ID, points: 300, source: { type: LOYALTY_SOURCE.PAYMENT, id: 'old' }, expiresInDays: -1 });
    const future = new Date(Date.now() + 86400000);
    const first = await ctx.service.expireDue(100, future);
    expect(first.expiredPoints).toBe(300);
    const acc = await ctx.accounts.findByCustomer(CUSTOMER_ID);
    expect(acc.balance).toBe(0);
    // Idempotent: a second sweep does nothing (lot already marked).
    const second = await ctx.service.expireDue(100, future);
    expect(second.expiredLots).toBe(0);
  });
});
