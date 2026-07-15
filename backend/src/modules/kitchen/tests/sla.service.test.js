import { describe, expect, it } from 'vitest';

import { SlaService } from '../services/sla.service.js';
import { KITCHEN_EVENTS } from '../events/kitchen.events.js';

import { createFakeEventBus } from './_helpers.js';

const TARGETS = [
  { scope: 'product', productId: 'burger', targetSeconds: 480 },
  { scope: 'category', categoryId: 'drinks', targetSeconds: 300 },
  { scope: 'default', targetSeconds: 900 },
];

function build(candidates = []) {
  const slas = { findActiveForBranch: async () => TARGETS };
  const queue = {
    async findSlaCandidates() {
      return candidates;
    },
    async markSlaBreached(id) {
      const c = candidates.find((x) => String(x._id) === String(id));
      return c ? { ...c, sla: { ...c.sla, breached: true } } : null;
    },
  };
  const events = createFakeEventBus();
  return { service: new SlaService({ slas, queue, eventBus: events }), events };
}

describe('SlaService.resolveTarget', () => {
  it('resolves most-specific-first (product > category > default)', async () => {
    const { service } = build();
    expect(await service.resolveTarget({}, [{ productId: 'burger', categoryId: 'food' }])).toBe(480);
    expect(await service.resolveTarget({}, [{ productId: 'x', categoryId: 'drinks' }])).toBe(300);
    expect(await service.resolveTarget({}, [{ productId: 'x', categoryId: 'y' }])).toBe(900);
  });

  it('uses the SLOWEST item as the order target', async () => {
    const { service } = build();
    const target = await service.resolveTarget({}, [
      { productId: 'x', categoryId: 'drinks' }, // 300
      { productId: 'burger', categoryId: 'food' }, // 480
    ]);
    expect(target).toBe(480);
  });
});

describe('SlaService breach detection', () => {
  it('flags a PREPARING entry past its target', () => {
    const { service } = build();
    const entry = { sla: { targetSeconds: 300 }, timers: { preparingAt: new Date('2026-07-15T12:00:00Z') } };
    expect(service.isBreached(entry, new Date('2026-07-15T12:06:00Z'))).toBe(true); // 6 min > 5 min
    expect(service.isBreached(entry, new Date('2026-07-15T12:04:00Z'))).toBe(false);
  });

  it('sweeps breaches and emits an event once', async () => {
    const candidate = {
      _id: 'e1', orderId: 'o1', branchId: 'br1', restaurantId: 'rest1',
      status: 'preparing', sla: { targetSeconds: 60, breached: false },
      timers: { preparingAt: new Date('2026-07-15T12:00:00Z') },
    };
    const { service, events } = build([candidate]);
    const res = await service.sweepBreaches(new Date('2026-07-15T12:05:00Z'));
    expect(res.breached).toBe(1);
    expect(events.names()).toContain(KITCHEN_EVENTS.SLA_BREACHED);
  });
});
