import { describe, expect, it } from 'vitest';

import { BaseRepository } from '../base.repository.js';
import { buildFilter } from './filtering.js';

/**
 * buildFilter guards CLIENT-supplied criteria: it must keep dropping object
 * values, or `?status[$ne]=archived` becomes a NoSQL operator injection.
 */
describe('buildFilter — client input stays sanitized', () => {
  it('drops an injected operator object on a plain field', () => {
    expect(buildFilter({ status: { $ne: 'archived' } }, { allowedFields: ['status'] })).toEqual({});
  });

  it('honours allowedFields', () => {
    expect(buildFilter({ secret: 'x' }, { allowedFields: ['status'] })).toEqual({});
  });

  it('supports the explicit __op suffix syntax', () => {
    expect(buildFilter({ status__in: 'a,b' }, { allowedFields: ['status'] })).toEqual({ status: { $in: ['a', 'b'] } });
  });
});

/**
 * Regression for a SILENT data-correctness bug. Services build real operator
 * filters (`status: { $in: ACTIVE }`); passing them as `filter` meant the
 * sanitizer deleted them and the query matched EVERYTHING — no error, just
 * wrong data. It surfaced as the staff "my active work" queue listing tickets
 * that were already served. Such filters now travel as `trustedFilter`.
 */
describe('paginate — trustedFilter survives sanitization', () => {
  class ProbeRepo extends BaseRepository {
    constructor() {
      super({ model: null });
      this.lastQuery = null;
    }

    // Capture the composed Mongo query without touching a database.
    get model() {
      const capture = (q) => { this.lastQuery = q; };
      return {
        find: (q) => { capture(q); return { sort: () => ({ skip: () => ({ limit: () => ({ session: () => [] }) }) }) }; },
        countDocuments: (q) => { capture(q); return { session: () => 0 }; },
      };
    }

    set model(_v) { /* base constructor assigns; the getter is what matters */ }
  }

  it('keeps a server-built $in and still drops an injected one', async () => {
    const repo = new ProbeRepo();
    await repo.paginate({
      filter: { status: { $ne: 'archived' } }, // pretend client input — must vanish
      trustedFilter: { status: { $in: ['pending', 'ready'] } },
      allowedFilterFields: ['status'],
    });
    expect(repo.lastQuery.status).toEqual({ $in: ['pending', 'ready'] });
  });
});
