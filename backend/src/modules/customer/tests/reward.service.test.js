import { randomUUID } from 'node:crypto';

import { beforeEach, describe, expect, it } from 'vitest';

import { RewardService } from '../services/reward.service.js';
import { ConflictError } from '#core/errors/app-error.js';
import { CUSTOMER_EVENTS } from '../events/customer.events.js';
import { REWARD_STATUS, REWARD_TYPE } from '../constants/customer.constants.js';

import { CUSTOMER_SCOPE, createFakeEventBus, fakeStore, noopLock } from './_helpers.js';

function makeReward(over = {}) {
  return { _id: 'rw-1', id: 'rw-1', organizationId: 'org1', restaurantId: 'rest1', name: 'Free Coffee', type: REWARD_TYPE.DISCOUNT, pointsCost: 500, status: REWARD_STATUS.ACTIVE, value: { discountBps: 1000, currency: 'INR' }, perCustomerLimit: null, totalStock: null, redemptionValidityDays: 30, ...over };
}

function build({ reward = makeReward(), redeemImpl } = {}) {
  const rewards = {
    reward,
    async findByIdScoped() { return this.reward; },
    async decrementStock() { return this.reward; },
    async findActiveForRestaurant() { return [this.reward]; },
  };
  const redemptions = {
    rows: [],
    async countForCustomerReward() { return 0; },
    async createScoped(_s, data) { const r = { _id: randomUUID(), id: undefined, ...data }; r.id = r._id; this.rows.push(r); return { ...r }; },
    async findByCode(code) { return this.rows.find((r) => r.code === code) ?? null; },
  };
  const customers = { timeline: [], async pushTimeline(id, e) { this.timeline.push(e); } };
  const customerSvc = { async ensureCustomer() { return { customerId: 'cust-1' }; } };
  const loyalty = {
    calls: [],
    redeem: redeemImpl ?? (async function (ctx) { this.calls.push(ctx); return { dto: { id: 'lg-1' }, ledgerId: 'lg-1', balance: 100, replayed: false }; }),
  };
  const events = createFakeEventBus();
  const service = new RewardService({ rewards, redemptions, customers, customerSvc, loyalty, store: fakeStore, lock: noopLock, eventBus: events });
  return { service, rewards, redemptions, customers, loyalty, events };
}

describe('RewardService — redeem', () => {
  let ctx;
  beforeEach(() => { ctx = build(); });

  it('debits points via loyalty and issues a pricing-ready redemption artifact', async () => {
    const dto = await ctx.service.redeem(CUSTOMER_SCOPE, 'rw-1', {});
    expect(dto.pointsSpent).toBe(500);
    expect(dto.rewardType).toBe(REWARD_TYPE.DISCOUNT);
    expect(dto.outcome.discountBps).toBe(1000); // pricing-ready
    expect(dto.code).toMatch(/^RWD-/);
    expect(ctx.loyalty.calls[0].points).toBe(500);
    expect(ctx.redemptions.rows).toHaveLength(1);
    expect(ctx.events.names()).toContain(CUSTOMER_EVENTS.REWARD_REDEEMED);
  });

  it('propagates insufficient-points as a 409 and issues no redemption', async () => {
    const bad = build({ redeemImpl: async () => { throw new ConflictError('Insufficient loyalty points'); } });
    await expect(bad.service.redeem(CUSTOMER_SCOPE, 'rw-1', {})).rejects.toMatchObject({ statusCode: 409 });
    expect(bad.redemptions.rows).toHaveLength(0);
  });

  it('refuses an inactive reward', async () => {
    const inactive = build({ reward: makeReward({ status: REWARD_STATUS.INACTIVE }) });
    await expect(inactive.service.redeem(CUSTOMER_SCOPE, 'rw-1', {})).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuses a reward that is out of stock', async () => {
    const oos = build({ reward: makeReward({ totalStock: 0 }) });
    await expect(oos.service.redeem(CUSTOMER_SCOPE, 'rw-1', {})).rejects.toMatchObject({ statusCode: 409 });
  });

  it('snapshots a free-product reward outcome', async () => {
    const fp = build({ reward: makeReward({ type: REWARD_TYPE.FREE_PRODUCT, value: { freeProductId: 'prod-9', currency: 'INR' } }) });
    const dto = await fp.service.redeem(CUSTOMER_SCOPE, 'rw-1', {});
    expect(dto.outcome.freeProductId).toBe('prod-9');
  });
});
