import { describe, expect, it } from 'vitest';

import { PricingService } from '../services/pricing.service.js';

const service = new PricingService();

describe('PricingService.resolvePrice', () => {
  it('returns the base price when no promotions apply', () => {
    const r = service.resolvePrice({ pricing: { basePrice: 200 } });
    expect(r).toMatchObject({ price: 200, source: 'base' });
  });

  it('prefers a variant price over the product base price', () => {
    const r = service.resolvePrice({ pricing: { basePrice: 200 } }, { variant: { price: 260 } });
    expect(r).toMatchObject({ price: 260, source: 'variant' });
  });

  it('applies a standing promotional price when lower than base', () => {
    const r = service.resolvePrice({ pricing: { basePrice: 200, promotionalPrice: 150 } });
    expect(r).toMatchObject({ price: 150, source: 'promotional' });
  });

  it('applies scheduled pricing within its active window', () => {
    const now = new Date('2026-07-15T12:00:00Z');
    const r = service.resolvePrice(
      {
        pricing: {
          basePrice: 200,
          scheduled: [
            {
              price: 120,
              startDate: '2026-07-01T00:00:00Z',
              endDate: '2026-07-31T00:00:00Z',
            },
          ],
        },
      },
      { now },
    );
    expect(r).toMatchObject({ price: 120, source: 'scheduled' });
  });

  it('ignores scheduled pricing outside its window', () => {
    const now = new Date('2026-08-15T12:00:00Z');
    const r = service.resolvePrice(
      {
        pricing: {
          basePrice: 200,
          scheduled: [{ price: 120, startDate: '2026-07-01T00:00:00Z', endDate: '2026-07-31T00:00:00Z' }],
        },
      },
      { now },
    );
    expect(r.price).toBe(200);
  });
});
