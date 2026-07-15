import { OrderCounter } from '../models/order-counter.model.js';

/**
 * Order counter repository — the only MongoDB access for the order-number
 * sequence. `next()` atomically increments and returns the per-key sequence via
 * an upsert, so concurrent order creation never yields a duplicate number.
 */
export class OrderCounterRepository {
  constructor(model = OrderCounter) {
    this.model = model;
  }

  async next(key, options = {}) {
    const doc = await this.model.findOneAndUpdate(
      { key },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, ...(options.session ? { session: options.session } : {}) },
    );
    return doc.seq;
  }
}

export const orderCounterRepository = new OrderCounterRepository();
export default orderCounterRepository;
