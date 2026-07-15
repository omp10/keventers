import { describe, expect, it } from 'vitest';

import { dayKeysInRange, isoWeek, periodKeys, timeDimensions } from '../utils/period.util.js';

describe('period key math (UTC)', () => {
  it('produces all six bucket keys for a moment', () => {
    const keys = periodKeys(new Date('2026-07-15T09:30:00Z'));
    expect(keys).toMatchObject({ hour: '2026-07-15T09', day: '2026-07-15', month: '2026-07', year: '2026', all: 'all' });
    expect(keys.week).toMatch(/^2026-W\d{2}$/);
  });

  it('computes ISO week correctly (2026-07-15 is week 29)', () => {
    expect(isoWeek(new Date('2026-07-15T00:00:00Z'))).toEqual({ year: 2026, week: 29 });
  });

  it('exposes hour-of-day + day-of-week for peak analysis', () => {
    const d = timeDimensions(new Date('2026-07-15T09:00:00Z')); // Wednesday
    expect(d.hourOfDay).toBe(9);
    expect(d.dayOfWeek).toBe(3);
  });

  it('lists inclusive day keys across a range', () => {
    const keys = dayKeysInRange(new Date('2026-07-14T00:00:00Z'), new Date('2026-07-16T23:00:00Z'));
    expect(keys).toEqual(['2026-07-14', '2026-07-15', '2026-07-16']);
  });

  it('keys are lexicographically sortable within a period', () => {
    const a = periodKeys(new Date('2026-07-15T00:00:00Z')).day;
    const b = periodKeys(new Date('2026-07-16T00:00:00Z')).day;
    expect(a < b).toBe(true);
  });
});
