import { describe, expect, it } from 'vitest';

import { isBranchOpen } from '../utils/business-hours.util.js';

// 2026-07-15 is a Wednesday. Use UTC for deterministic assertions.
const hours = [
  { day: 'wednesday', isOpen: true, open: '09:00', close: '22:00' },
  { day: 'thursday', isOpen: false, open: '09:00', close: '22:00' },
];

describe('isBranchOpen', () => {
  it('treats unconfigured hours as always open', () => {
    expect(isBranchOpen([], 'UTC').open).toBe(true);
  });

  it('is open inside the day window', () => {
    expect(isBranchOpen(hours, 'UTC', new Date('2026-07-15T12:00:00Z')).open).toBe(true);
  });

  it('is closed before opening', () => {
    expect(isBranchOpen(hours, 'UTC', new Date('2026-07-15T06:00:00Z')).open).toBe(false);
  });

  it('is closed on a day flagged closed', () => {
    expect(isBranchOpen(hours, 'UTC', new Date('2026-07-16T12:00:00Z')).open).toBe(false);
  });

  it('handles overnight windows spanning midnight', () => {
    const overnight = [{ day: 'wednesday', isOpen: true, open: '18:00', close: '02:00' }];
    expect(isBranchOpen(overnight, 'UTC', new Date('2026-07-15T20:00:00Z')).open).toBe(true);
    expect(isBranchOpen(overnight, 'UTC', new Date('2026-07-15T01:00:00Z')).open).toBe(true);
    expect(isBranchOpen(overnight, 'UTC', new Date('2026-07-15T10:00:00Z')).open).toBe(false);
  });
});
