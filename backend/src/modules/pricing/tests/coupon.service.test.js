import { beforeEach, describe, expect, it } from 'vitest';

import { MockRepository } from '#testing/index.js';
import { buildTenantContext } from '#modules/organization/index.js';

import { CouponService } from '../services/coupon.service.js';
import { COUPON_TYPE } from '../constants/pricing.constants.js';

class FakeCouponRepo extends MockRepository {
  constructor() {
    super({ softDelete: true });
  }
  existsByCode(scope, code) {
    return this.exists({ organizationId: scope.organizationId, restaurantId: scope.restaurantId, code: String(code).toUpperCase() });
  }
  findByCode(scope, code) {
    return this.findOne({ organizationId: scope.organizationId, restaurantId: scope.restaurantId, code: String(code).toUpperCase() });
  }
  paginateScoped(scope, params = {}) {
    return this.paginate({ ...params, filter: { ...(params.filter ?? {}), organizationId: scope.organizationId, restaurantId: scope.restaurantId } });
  }
}

const tenant = (role = 'organization_admin', org = 'org1', rest = 'rest1') =>
  buildTenantContext({ principal: { id: 'u1', roles: [role] }, memberships: [{ organizationId: org, restaurantId: rest, isOwner: true }] });

const events = { published: [], async publish(e) { this.published.push(e); }, subscribe() {} };
const scopeResolver = () => async () => ({ organizationId: 'org1', restaurantId: 'rest1', restaurant: { _id: 'rest1' } });

function build() {
  const coupons = new FakeCouponRepo();
  const service = new CouponService({ coupons, resolveScope: scopeResolver(), eventBus: { ...events, published: [] } });
  return { service, coupons };
}

describe('CouponService', () => {
  let ctx;
  beforeEach(() => {
    ctx = build();
  });

  it('creates a coupon (code upper-cased) and resolves it by code', async () => {
    const dto = await ctx.service.createCoupon(tenant(), 'rest1', { code: 'save20', type: COUPON_TYPE.PERCENTAGE, value: 2000 });
    expect(dto.code).toBe('SAVE20');
    const resolved = await ctx.service.resolveForApply({ organizationId: 'org1', restaurantId: 'rest1' }, 'save20');
    expect(resolved.code).toBe('SAVE20');
  });

  it('rejects a duplicate code (409)', async () => {
    await ctx.service.createCoupon(tenant(), 'rest1', { code: 'DUP', type: COUPON_TYPE.FIXED, value: 1000 });
    await expect(
      ctx.service.createCoupon(tenant(), 'rest1', { code: 'dup', type: COUPON_TYPE.FIXED, value: 1000 }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('blocks cross-tenant access (403)', async () => {
    const created = await ctx.service.createCoupon(tenant(), 'rest1', { code: 'X', type: COUPON_TYPE.FIXED, value: 1000 });
    const other = tenant('restaurant_manager', 'orgX', 'restX');
    await expect(ctx.service.getCoupon(other, created.id)).rejects.toMatchObject({ statusCode: 403 });
  });
});
