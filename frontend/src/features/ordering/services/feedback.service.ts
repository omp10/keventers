import { api } from '@/platform/api';

/**
 * FEEDBACK SERVICE — the customer's post-order review.
 *
 * This is the SOURCE OF TRUTH for both ratings in the product: the backend
 * recomputes each dish's rating from `itemRatings` and the restaurant's rating
 * from the store/service score on every submission. Nothing else writes them.
 */
export type ItemRating = { productId: string; rating: number; comment?: string };

export type FeedbackDraft = {
  orderId: string;
  /** The RESTAURANT experience. */
  storeRating?: number | null;
  serviceRating?: number | null;
  /** Overall food score (the per-dish detail lives in `itemRatings`). */
  foodRating?: number | null;
  npsScore?: number | null;
  comment?: string;
  /** Per-DISH scores — one per product the customer actually ordered. */
  itemRatings?: ItemRating[];
};

export type Feedback = FeedbackDraft & { id: string; createdAt: string };

class FeedbackService {
  submit(draft: FeedbackDraft) {
    return api.post<Feedback>('/customer/feedback', draft);
  }

  /** The review already left for an order (null when not reviewed yet). */
  forOrder(orderId: string) {
    return api.get<Feedback | null>(`/customer/feedback/${orderId}`);
  }
}

export const feedbackService = new FeedbackService();
