import { describe, expect, it } from 'vitest';

import { buildFilter } from '#core/repository/query/filtering.js';

/**
 * Security regression for buildFilter — the safe filter builder must not let
 * client-supplied values inject Mongo operators or a ReDoS regex.
 */
describe('buildFilter — NoSQL injection hardening', () => {
  it('rejects an object value on a plain field (blocks ?status[$ne]= operator injection)', () => {
    const out = buildFilter({ status: { $ne: 'archived' } }, { allowedFields: ['status'] });
    expect(out).toEqual({}); // the injected operator object is dropped, not passed through
  });

  it('rejects an object operand on a comparison operator', () => {
    const out = buildFilter({ price__gte: { $gt: 0 } }, { allowedFields: ['price'] });
    expect(out).toEqual({});
  });

  it('drops fields not in the allowlist', () => {
    const out = buildFilter({ status: 'active', secret: 'x' }, { allowedFields: ['status'] });
    expect(out).toEqual({ status: 'active' });
  });

  it('no longer supports a $regex operator (ReDoS vector removed)', () => {
    const out = buildFilter({ name__regex: '.*(a+)+.*' }, { allowedFields: ['name'] });
    expect(out).toEqual({}); // regex operator is not mapped
  });

  it('still builds legitimate scalar + in/range filters', () => {
    const out = buildFilter({ status__in: 'active,paused', price__gte: '100', price__lte: '500' }, { allowedFields: ['status', 'price'] });
    expect(out).toEqual({ status: { $in: ['active', 'paused'] }, price: { $gte: 100, $lte: 500 } });
  });

  it('filters non-primitive members out of an $in list', () => {
    const out = buildFilter({ status__in: ['active', { $ne: 'x' }] }, { allowedFields: ['status'] });
    expect(out).toEqual({ status: { $in: ['active'] } });
  });
});
