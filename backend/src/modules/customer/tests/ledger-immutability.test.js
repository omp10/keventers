import { describe, expect, it } from 'vitest';

import { loyaltyLedgerRepository } from '../repositories/loyalty-ledger.repository.js';
import { toCustomerDTO, toLedgerDTO, toLoyaltyDTO } from '../dto/customer.dto.js';

describe('Loyalty ledger — immutability guard (repository layer)', () => {
  it('rejects every update path so the points ledger is append-only', async () => {
    await expect(loyaltyLedgerRepository.updateById('x', {})).rejects.toThrow(/immutable/i);
    await expect(loyaltyLedgerRepository.updateOne({}, {})).rejects.toThrow(/immutable/i);
    await expect(loyaltyLedgerRepository.updateWithVersion('x', 0, {})).rejects.toThrow(/immutable/i);
  });
});

describe('Customer DTO — hygiene', () => {
  it('omits staff-only internals from the customer-facing DTO', () => {
    const dto = toCustomerDTO({ _id: 'c1', userId: 'u1', displayName: 'Asha', email: 'a@x.com', tags: ['vip'], metadata: { seg: 'A' }, stats: { lifetimeSpend: 100000 }, marketing: { optedIn: true, consents: [{ type: 'marketing_email' }] } });
    expect(dto.id).toBe('c1');
    expect(dto).not.toHaveProperty('userId'); // internal cross-ref hidden from customer
    expect(dto).not.toHaveProperty('tags');
    expect(dto.marketing).toEqual({ optedIn: true }); // consents are staff-only
  });

  it('exposes staff-only fields under forStaff', () => {
    const dto = toCustomerDTO({ _id: 'c1', userId: 'u1', tags: ['vip'], stats: {}, marketing: { optedIn: true, consents: [{ type: 'marketing_email' }] } }, { forStaff: true });
    expect(dto.userId).toBe('u1');
    expect(dto.tags).toEqual(['vip']);
    expect(dto.marketing.consents).toHaveLength(1);
  });

  it('renders integer points/money in loyalty + ledger DTOs', () => {
    const l = toLoyaltyDTO({ balance: 1500, lifetimePoints: 3000, tier: 'silver' });
    expect(l).toMatchObject({ balance: 1500, lifetimePoints: 3000, tier: 'silver' });
    const e = toLedgerDTO({ _id: 'e1', reference: 'LP-1', type: 'earn', points: 500, balanceAfter: 1500, source: { type: 'payment', id: 'p1' } });
    expect(e).toMatchObject({ points: 500, balanceAfter: 1500, source: { type: 'payment', id: 'p1' } });
  });
});
