import { describe, expect, it } from 'vitest';

import { AvailabilityService } from '../services/availability.service.js';
import { AVAILABILITY_STATUS } from '../constants/catalog.constants.js';

const service = new AvailabilityService();

describe('AvailabilityService.resolveAvailability', () => {
  it('is available by default', () => {
    const r = service.resolveAvailability({ availability: {} });
    expect(r.available).toBe(true);
  });

  it('is unavailable when marked out of stock', () => {
    const r = service.resolveAvailability({
      availability: { status: AVAILABILITY_STATUS.OUT_OF_STOCK },
    });
    expect(r.available).toBe(false);
  });

  it('lets a branch override disable an otherwise-available product', () => {
    const r = service.resolveAvailability(
      { availability: { status: AVAILABILITY_STATUS.AVAILABLE } },
      { override: { isAvailable: false, reason: 'Sold out at branch' } },
    );
    expect(r.available).toBe(false);
    expect(r.reason).toMatch(/branch/i);
  });

  it('honours a time window (available inside, blocked outside)', () => {
    const product = {
      availability: {
        scheduled: true,
        windows: [{ days: ['tuesday'], startTime: '08:00', endTime: '11:00' }],
      },
    };
    // 2026-07-14 is a Tuesday.
    const inside = service.resolveAvailability(product, { now: new Date('2026-07-14T09:00:00Z') });
    const outside = service.resolveAvailability(product, { now: new Date('2026-07-14T15:00:00Z') });
    expect(inside.available).toBe(true);
    expect(outside.available).toBe(false);
  });
});
