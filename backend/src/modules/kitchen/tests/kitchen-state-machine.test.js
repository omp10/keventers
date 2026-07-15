import { describe, expect, it } from 'vitest';

import {
  assertTransition,
  canTransition,
  isActive,
  isTerminal,
} from '../utils/kitchen-state-machine.js';
import { KITCHEN_STATUS } from '../constants/kitchen.constants.js';

describe('kitchen state machine', () => {
  it('permits the happy path', () => {
    const path = [
      [KITCHEN_STATUS.PENDING, KITCHEN_STATUS.ASSIGNED],
      [KITCHEN_STATUS.ASSIGNED, KITCHEN_STATUS.PREPARING],
      [KITCHEN_STATUS.PREPARING, KITCHEN_STATUS.READY],
      [KITCHEN_STATUS.READY, KITCHEN_STATUS.SERVED],
    ];
    for (const [f, t] of path) expect(canTransition(f, t)).toBe(true);
  });

  it('permits recall (PREPARING→RECALLED→PREPARING) and refire (READY→REFIRED→PREPARING)', () => {
    expect(canTransition(KITCHEN_STATUS.PREPARING, KITCHEN_STATUS.RECALLED)).toBe(true);
    expect(canTransition(KITCHEN_STATUS.RECALLED, KITCHEN_STATUS.PREPARING)).toBe(true);
    expect(canTransition(KITCHEN_STATUS.READY, KITCHEN_STATUS.REFIRED)).toBe(true);
    expect(canTransition(KITCHEN_STATUS.REFIRED, KITCHEN_STATUS.PREPARING)).toBe(true);
  });

  it('permits cancellation from active states', () => {
    expect(canTransition(KITCHEN_STATUS.PENDING, KITCHEN_STATUS.CANCELLED)).toBe(true);
    expect(canTransition(KITCHEN_STATUS.PREPARING, KITCHEN_STATUS.CANCELLED)).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition(KITCHEN_STATUS.PENDING, KITCHEN_STATUS.READY)).toBe(false);
    expect(canTransition(KITCHEN_STATUS.SERVED, KITCHEN_STATUS.PREPARING)).toBe(false);
    expect(canTransition(KITCHEN_STATUS.READY, KITCHEN_STATUS.PENDING)).toBe(false);
    expect(() => assertTransition(KITCHEN_STATUS.PENDING, KITCHEN_STATUS.SERVED)).toThrow(/transition/i);
  });

  it('classifies terminal + active statuses', () => {
    expect(isTerminal(KITCHEN_STATUS.SERVED)).toBe(true);
    expect(isTerminal(KITCHEN_STATUS.CANCELLED)).toBe(true);
    expect(isActive(KITCHEN_STATUS.PREPARING)).toBe(true);
    expect(isActive(KITCHEN_STATUS.SERVED)).toBe(false);
  });
});
