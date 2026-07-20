import mongoose from 'mongoose';

import { ValidationError } from '#core/errors/app-error.js';

import { Feedback } from '../models/feedback.model.js';

/**
 * FEEDBACK SERVICE — post-order NPS + dual ratings (food / service / store).
 * One submission per order (unique index); resubmitting updates in place so a
 * customer changing their mind never errors.
 */
const scopeOf = (t) => ({ organizationId: t.organizationId, restaurantId: t.restaurantId });

class FeedbackService {
  async submit(
    scope,
    { orderId, npsScore, foodRating, serviceRating, storeRating, comment, itemRatings },
    { customerId = null, guestSessionId = null } = {},
  ) {
    const hasItems = Array.isArray(itemRatings) && itemRatings.length > 0;
    if (npsScore == null && foodRating == null && serviceRating == null && storeRating == null && !comment && !hasItems) {
      throw new ValidationError('Nothing to submit');
    }

    // The review belongs to the ORDER's branch, not wherever the reviewer
    // happens to be sitting now: someone rating from their account (no live
    // table session) carries no branch, which left the branch rating never
    // recomputing. The order is the authority.
    const { orderService } = await import('#modules/order/index.js');
    const order = await orderService.getByIdSystem(String(orderId)).catch(() => null);
    const branchId = order?.branchId ? String(order.branchId) : scope.branchId ?? null;

    const doc = await Feedback.findOneAndUpdate(
      { orderId },
      {
        $set: {
          ...scopeOf(scope),
          branchId,
          customerId,
          guestSessionId,
          npsScore: npsScore ?? null,
          foodRating: foodRating ?? null,
          serviceRating: serviceRating ?? null,
          storeRating: storeRating ?? null,
          comment: comment ?? '',
          ...(itemRatings ? { itemRatings } : {}),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Feedback is the SOURCE OF TRUTH for both ratings — recompute the derived
    // aggregates now so the menu and discovery listings reflect this submission
    // immediately. Best-effort: a failed rollup must never reject the review.
    await Promise.all([
      hasItems ? this.#recomputeProductRatings(itemRatings.map((i) => i.productId)) : null,
      this.#recomputeBranchRating(scope.restaurantId, branchId),
    ]).catch(() => {});

    return doc.toJSON();
  }

  /** Recompute each product's rating from every feedback that scored it. */
  async #recomputeProductRatings(productIds) {
    const { productService } = await import('#modules/catalog/index.js');
    const ids = [...new Set(productIds.map(String))];
    for (const id of ids) {
      const [agg] = await Feedback.aggregate([
        { $unwind: '$itemRatings' },
        { $match: { 'itemRatings.productId': new mongoose.Types.ObjectId(id) } },
        { $group: { _id: null, avg: { $avg: '$itemRatings.rating' }, n: { $sum: 1 } } },
      ]);
      await productService.applyRatingSystem(id, {
        rating: agg ? Math.round(agg.avg * 10) / 10 : null,
        ratingCount: agg?.n ?? 0,
      });
    }
  }

  /**
   * Recompute a branch's rating from the RESTAURANT scores customers gave
   * (store rating, falling back to service). This is what discovery shows.
   */
  async #recomputeBranchRating(_restaurantId, branchId) {
    if (!branchId) return;
    const { branchService } = await import('#modules/organization/index.js');
    const [agg] = await Feedback.aggregate([
      { $match: { branchId: new mongoose.Types.ObjectId(String(branchId)) } },
      { $project: { score: { $ifNull: ['$storeRating', '$serviceRating'] } } },
      { $match: { score: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$score' }, n: { $sum: 1 } } },
    ]);
    await branchService.applyRatingSystem(branchId, {
      rating: agg ? Math.round(agg.avg * 10) / 10 : null,
      ratingCount: agg?.n ?? 0,
    });
  }

  async getForOrder(orderId) {
    const doc = await Feedback.findOne({ orderId }).lean({ virtuals: true });
    return doc ? { ...doc, id: String(doc._id) } : null;
  }

  async listForRestaurant(restaurantId, { page = 1, limit = 25 } = {}) {
    const rows = await Feedback.find({ restaurantId })
      .sort({ createdAt: -1 })
      .skip((Math.max(1, page) - 1) * limit)
      .limit(limit)
      .populate('customerId', 'name phone')
      .lean({ virtuals: true });
    return rows.map((r) => ({ ...r, id: String(r._id), customer: r.customerId ?? null }));
  }

  /** NPS = %promoters(9-10) − %detractors(0-6), plus rating averages. */
  async summary(restaurantId) {
    const oid = new mongoose.Types.ObjectId(String(restaurantId));
    const [agg] = await Feedback.aggregate([
      { $match: { restaurantId: oid } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          npsResponses: { $sum: { $cond: [{ $ne: ['$npsScore', null] }, 1, 0] } },
          promoters: { $sum: { $cond: [{ $gte: ['$npsScore', 9] }, 1, 0] } },
          detractors: { $sum: { $cond: [{ $and: [{ $ne: ['$npsScore', null] }, { $lte: ['$npsScore', 6] }] }, 1, 0] } },
          avgFood: { $avg: '$foodRating' },
          avgService: { $avg: '$serviceRating' },
          avgStore: { $avg: '$storeRating' },
        },
      },
    ]);
    if (!agg || agg.npsResponses === 0) {
      return { total: agg?.total ?? 0, nps: null, avgFood: agg?.avgFood ?? null, avgService: agg?.avgService ?? null, avgStore: agg?.avgStore ?? null };
    }
    const nps = Math.round(((agg.promoters - agg.detractors) / agg.npsResponses) * 100);
    const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
    return { total: agg.total, nps, avgFood: r1(agg.avgFood), avgService: r1(agg.avgService), avgStore: r1(agg.avgStore) };
  }
}

export const feedbackService = new FeedbackService();
export default feedbackService;
