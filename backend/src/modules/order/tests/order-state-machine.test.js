import { describe, expect, it } from 'vitest';

import {
  assertTransition,
  canTransition,
  initialTimeline,
  isTerminal,
  timelineEntry,
} from '../utils/order-state-machine.js';
import { ORDER_STATUS } from '../constants/order.constants.js';

describe('order state machine', () => {
  it('permits the happy-path progression', () => {
    const path = [
      [ORDER_STATUS.PLACED, ORDER_STATUS.CONFIRMED],
      [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING],
      [ORDER_STATUS.PREPARING, ORDER_STATUS.READY],
      [ORDER_STATUS.READY, ORDER_STATUS.SERVED],
      [ORDER_STATUS.SERVED, ORDER_STATUS.COMPLETED],
    ];
    for (const [from, to] of path) expect(canTransition(from, to)).toBe(true);
  });

  it('permits cancellation from PLACED and CONFIRMED', () => {
    expect(canTransition(ORDER_STATUS.PLACED, ORDER_STATUS.CANCELLED)).toBe(true);
    expect(canTransition(ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED)).toBe(true);
  });

  it('permits the refund flow from COMPLETED', () => {
    expect(canTransition(ORDER_STATUS.COMPLETED, ORDER_STATUS.REFUND_PENDING)).toBe(true);
    expect(canTransition(ORDER_STATUS.REFUND_PENDING, ORDER_STATUS.REFUNDED)).toBe(true);
    expect(canTransition(ORDER_STATUS.REFUND_PENDING, ORDER_STATUS.COMPLETED)).toBe(true); // rejection
  });

  it('rejects illegal transitions', () => {
    expect(canTransition(ORDER_STATUS.PLACED, ORDER_STATUS.SERVED)).toBe(false);
    expect(canTransition(ORDER_STATUS.COMPLETED, ORDER_STATUS.PREPARING)).toBe(false);
    expect(canTransition(ORDER_STATUS.CANCELLED, ORDER_STATUS.CONFIRMED)).toBe(false);
    expect(() => assertTransition(ORDER_STATUS.PLACED, ORDER_STATUS.SERVED)).toThrow(/transition/i);
  });

  it('flags terminal statuses', () => {
    expect(isTerminal(ORDER_STATUS.COMPLETED)).toBe(true);
    expect(isTerminal(ORDER_STATUS.CANCELLED)).toBe(true);
    expect(isTerminal(ORDER_STATUS.REFUNDED)).toBe(true);
    expect(isTerminal(ORDER_STATUS.PREPARING)).toBe(false);
  });

  it('builds immutable timeline entries', () => {
    const at = new Date('2026-07-15T12:00:00Z');
    const e = timelineEntry({ previousStatus: 'placed', newStatus: 'confirmed', actorId: 'u1', actorType: 'restaurant', at });
    expect(e).toMatchObject({ previousStatus: 'placed', newStatus: 'confirmed', actorId: 'u1', actorType: 'restaurant', at });
  });

  it('creates a CREATED→PLACED initial timeline', () => {
    const tl = initialTimeline({ actorId: null, actorType: 'guest' });
    expect(tl.map((t) => t.newStatus)).toEqual([ORDER_STATUS.CREATED, ORDER_STATUS.PLACED]);
  });
});
