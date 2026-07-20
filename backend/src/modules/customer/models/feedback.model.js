import mongoose from 'mongoose';

import { baseSchemaOptions, tenantFields } from '../utils/schema.util.js';

const { Schema } = mongoose;

const rating = { type: Number, min: 1, max: 5, default: null };

/**
 * Feedback — the SOW's post-order NPS + dual-rating capture (food AND
 * restaurant/service), one per order. Identity is whatever was known at
 * submission: the linked customer, or just the guest session.
 */
const feedbackSchema = new Schema(
  {
    ...tenantFields,
    branchId: { type: Schema.Types.ObjectId, default: null },

    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    guestSessionId: { type: String, default: null },

    /** NPS: "how likely are you to recommend us" 0–10. */
    npsScore: { type: Number, min: 0, max: 10, default: null },

    /** The dual capture: the FOOD and the RESTAURANT experience. */
    foodRating: rating,
    serviceRating: rating,
    storeRating: rating,

    /**
     * PER-DISH ratings — the customer rates each item they actually ordered.
     * These aggregate into `product.rating`, making feedback the single source
     * of truth for dish ratings (nothing else may write them).
     */
    itemRatings: {
      type: [
        new Schema(
          {
            productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
            rating: { type: Number, min: 1, max: 5, required: true },
            comment: { type: String, trim: true, maxlength: 300, default: '' },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    comment: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  baseSchemaOptions,
);

feedbackSchema.index({ orderId: 1 }, { unique: true });
feedbackSchema.index({ organizationId: 1, restaurantId: 1, createdAt: -1 });

export const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);

export default Feedback;
