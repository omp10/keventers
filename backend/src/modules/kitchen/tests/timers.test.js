import { describe, expect, it } from 'vitest';

import { computeTimers } from '../utils/timers.util.js';

describe('computeTimers', () => {
  it('computes final durations once served', () => {
    const t = {
      queuedAt: new Date('2026-07-15T12:00:00Z'),
      preparingAt: new Date('2026-07-15T12:02:00Z'),
      readyAt: new Date('2026-07-15T12:09:00Z'),
      servedAt: new Date('2026-07-15T12:10:00Z'),
    };
    const r = computeTimers(t);
    expect(r.queueTimeSeconds).toBe(120); // 2 min
    expect(r.prepTimeSeconds).toBe(420); // 7 min
    expect(r.readyTimeSeconds).toBe(60); // 1 min
    expect(r.totalKitchenTimeSeconds).toBe(600); // 10 min
  });

  it('computes live elapsed prep time for an in-progress entry', () => {
    const now = new Date('2026-07-15T12:05:00Z');
    const r = computeTimers(
      { queuedAt: new Date('2026-07-15T12:00:00Z'), preparingAt: new Date('2026-07-15T12:02:00Z') },
      now,
    );
    expect(r.prepTimeSeconds).toBe(180); // 3 min so far
    expect(r.totalKitchenTimeSeconds).toBe(300);
  });
});
