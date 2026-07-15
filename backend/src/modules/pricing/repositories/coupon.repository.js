import { BaseRepository } from '#core/repository/base.repository.js';

import { Coupon } from '../models/coupon.model.js';

/**
 * Coupon repository — the only MongoDB access for coupons. Scoping by
 * organization + restaurant is applied via the explicit finder arguments below
 * (services pass a resolved scope; a lookup outside it returns null).
 */
export class CouponRepository extends BaseRepository {
  constructor(model = Coupon) {
    super(model, { softDelete: true, searchableFields: ['code', 'description'] });
  }

  findByCode(scope, code) {
    return this.findOne({
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      code: String(code).toUpperCase(),
    });
  }

  existsByCode(scope, code) {
    return this.exists({
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      code: String(code).toUpperCase(),
    });
  }

  paginateScoped(scope, params = {}, options = {}) {
    // Keep the trusted tenant scope in allowedFilterFields so buildFilter cannot
    // strip it (which would leak coupons across restaurants).
    const allowedFilterFields = params.allowedFilterFields
      ? [...new Set([...params.allowedFilterFields, 'organizationId', 'restaurantId'])]
      : params.allowedFilterFields;
    return this.paginate(
      {
        ...params,
        filter: {
          ...(params.filter ?? {}),
          organizationId: scope.organizationId,
          restaurantId: scope.restaurantId,
        },
        allowedFilterFields,
      },
      options,
    );
  }

  /** Atomically increment usage (called when a coupon-bearing cart converts). */
  incrementUsage(couponId, options = {}) {
    return this.model.updateOne(
      { _id: couponId },
      { $inc: { usageCount: 1 } },
      options.session ? { session: options.session } : {},
    );
  }
}

export const couponRepository = new CouponRepository();
export default couponRepository;
