import { describe, expect, it } from 'vitest';

import { OrderNumberService } from '../services/order-number.service.js';
import { ORDER_TYPE } from '../constants/order.constants.js';
import {
  buildOrderNumber,
  dateStamp,
  resolvePrefix,
} from '../utils/order-number.util.js';

describe('order-number util', () => {
  it('derives a prefix from config, slug, or default', () => {
    expect(resolvePrefix({ settings: { orderNumberPrefix: 'KEV' } })).toBe('KEV');
    expect(resolvePrefix({ slug: 'keventers-cp' })).toBe('KEVEN');
    expect(resolvePrefix({})).toBe('ORD');
  });

  it('stamps the date in the restaurant timezone (YYYYMMDD)', () => {
    expect(dateStamp(new Date('2026-07-15T12:00:00Z'), 'UTC')).toBe('20260715');
  });

  it('assembles KEV-DIN-20260715-000123', () => {
    expect(buildOrderNumber({ prefix: 'KEV', orderType: ORDER_TYPE.DINE_IN, stamp: '20260715', sequence: 123 })).toBe(
      'KEV-DIN-20260715-000123',
    );
  });
});

describe('OrderNumberService', () => {
  it('produces unique, increasing numbers from an atomic counter', async () => {
    const seqByKey = new Map();
    const counters = {
      async next(key) {
        const n = (seqByKey.get(key) ?? 0) + 1;
        seqByKey.set(key, n);
        return n;
      },
    };
    const service = new OrderNumberService({ counters });
    const restaurant = { id: 'rest1', slug: 'keventers', settings: { timezone: 'UTC' } };
    const now = new Date('2026-07-15T12:00:00Z');
    const a = await service.generate(restaurant, ORDER_TYPE.DINE_IN, now);
    const b = await service.generate(restaurant, ORDER_TYPE.DINE_IN, now);
    expect(a).toBe('KEVEN-DIN-20260715-000001');
    expect(b).toBe('KEVEN-DIN-20260715-000002');
    expect(a).not.toBe(b);
  });
});
