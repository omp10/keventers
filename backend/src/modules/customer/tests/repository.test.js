import { describe, expect, it } from 'vitest';

import { CustomerScopedRepository } from '../repositories/customer-scoped.repository.js';
import { LoyaltyLedgerRepository } from '../repositories/loyalty-ledger.repository.js';

/**
 * Repository-layer guarantees that don't need MongoDB: the scoped paginate must
 * always whitelist the tenant fields, so `buildFilter` can never strip the trusted
 * organization/restaurant scope (the platform-wide cross-tenant-leak fix).
 */
class ProbeRepo extends CustomerScopedRepository {
  constructor() {
    super({ /* fake model */ }, { softDelete: false });
    this.lastPaginate = null;
  }
  // Capture what paginateScoped forwards to the base paginate.
  paginate(params) {
    this.lastPaginate = params;
    return Promise.resolve({ items: [], meta: {} });
  }
}

describe('CustomerScopedRepository — tenant isolation', () => {
  it('injects the org+restaurant scope into every scoped filter', () => {
    const repo = new ProbeRepo();
    const filter = repo.scoped({ organizationId: 'org1', restaurantId: 'rest1' }, { accountStatus: 'active' });
    expect(filter).toMatchObject({ organizationId: 'org1', restaurantId: 'rest1', accountStatus: 'active' });
  });

  it('whitelists tenant fields in paginateScoped so buildFilter cannot strip the scope', async () => {
    const repo = new ProbeRepo();
    await repo.paginateScoped({ organizationId: 'org1', restaurantId: 'rest1' }, { allowedFilterFields: ['accountStatus'] });
    expect(repo.lastPaginate.allowedFilterFields).toEqual(expect.arrayContaining(['accountStatus', 'organizationId', 'restaurantId']));
    expect(repo.lastPaginate.filter).toMatchObject({ organizationId: 'org1', restaurantId: 'rest1' });
  });

  it('never leaks another tenant: a different restaurant scope changes the filter', () => {
    const repo = new ProbeRepo();
    const a = repo.scoped({ organizationId: 'org1', restaurantId: 'rest1' });
    const b = repo.scoped({ organizationId: 'org1', restaurantId: 'rest2' });
    expect(a.restaurantId).not.toBe(b.restaurantId);
  });
});

/**
 * Regression for the CRITICAL cross-tenant loyalty-ledger leak: `paginateForCustomer`
 * MUST whitelist `customerId` (its only scope) in allowedFilterFields, or
 * buildFilter strips it and returns every customer's ledger platform-wide.
 */
describe('LoyaltyLedgerRepository.paginateForCustomer — scope not stripped', () => {
  class ProbeLedger extends LoyaltyLedgerRepository {
    constructor() {
      super({});
      this.last = null;
    }
    paginate(params) {
      this.last = params;
      return Promise.resolve({ items: [], meta: {} });
    }
  }

  it('whitelists customerId so buildFilter cannot strip the customer scope', async () => {
    const repo = new ProbeLedger();
    await repo.paginateForCustomer('cust-1', { filter: { type: 'earn' } });
    expect(repo.last.filter).toMatchObject({ customerId: 'cust-1', type: 'earn' });
    expect(repo.last.allowedFilterFields).toEqual(expect.arrayContaining(['customerId', 'type']));
  });
});
