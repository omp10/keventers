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
  async submit(scope, { orderId, npsScore, foodRating, serviceRating, storeRating, comment }, { customerId = null, guestSessionId = null } = {}) {
    if (npsScore == null && foodRating == null && serviceRating == null && storeRating == null && !comment) {
      throw new ValidationError('Nothing to submit');
    }
    const doc = await Feedback.findOneAndUpdate(
      { orderId },
      {
        $set: {
          ...scopeOf(scope),
          branchId: scope.branchId ?? null,
          customerId,
          guestSessionId,
          npsScore: npsScore ?? null,
          foodRating: foodRating ?? null,
          serviceRating: serviceRating ?? null,
          storeRating: storeRating ?? null,
          comment: comment ?? '',
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return doc.toJSON();
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
