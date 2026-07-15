import { describe, expect, it } from 'vitest';

import { toOrderDTO } from '../dto/order.dto.js';
import { NOTE_VISIBILITY } from '../constants/order.constants.js';

const order = {
  _id: 'o1',
  orderNumber: 'KEV-DIN-20260715-000001',
  organizationId: 'org1',
  restaurantId: 'rest1',
  branchId: 'br1',
  sessionId: 's1',
  cartId: 'c1',
  status: 'placed',
  currency: 'INR',
  items: [{ _id: 'i1', productId: 'p1', quantity: 2, pricing: { unitPrice: 20000 }, lineSubtotal: 40000 }],
  pricing: { total: { amount: 42000, currency: 'INR', major: 420 } },
  snapshots: { restaurant: { name: 'Keventers' } },
  timeline: [{ newStatus: 'placed', at: new Date() }],
  notes: [
    { _id: 'n1', type: 'restaurant', visibility: NOTE_VISIBILITY.PUBLIC, body: 'Ready soon', at: new Date() },
    { _id: 'n2', type: 'kitchen', visibility: NOTE_VISIBILITY.INTERNAL, body: 'No onions - allergy', at: new Date() },
  ],
};

describe('toOrderDTO', () => {
  it('passes the Pricing-Engine breakdown through unchanged', () => {
    expect(toOrderDTO(order).pricing.total.amount).toBe(42000);
  });

  it('hides INTERNAL notes + snapshots from customers', () => {
    const dto = toOrderDTO(order, { forStaff: false });
    expect(dto.notes).toHaveLength(1);
    expect(dto.notes[0].body).toBe('Ready soon');
    expect(dto.snapshots).toBeUndefined();
    expect(dto.cartId).toBeUndefined();
  });

  it('shows all notes + snapshots to staff', () => {
    const dto = toOrderDTO(order, { forStaff: true });
    expect(dto.notes).toHaveLength(2);
    expect(dto.snapshots).toMatchObject({ restaurant: { name: 'Keventers' } });
    expect(dto.cartId).toBe('c1');
  });
});
