import { BaseService } from '#core/service/base.service.js';

import { orderCounterRepository } from '../repositories/order-counter.repository.js';
import {
  buildOrderNumber,
  counterKey,
  dateStamp,
  resolvePrefix,
} from '../utils/order-number.util.js';

/**
 * Enterprise order-number generation. Combines a configurable restaurant prefix,
 * a fulfilment-channel code, the local date and an ATOMIC per-(restaurant, day)
 * sequence — e.g. `KEV-DIN-20260715-000123`. Never exposes a Mongo id; the
 * unique `orderNumber` index is the final guarantee against collisions.
 */
export class OrderNumberService extends BaseService {
  constructor({ counters = orderCounterRepository, eventBus } = {}) {
    super({ name: 'order.number', eventBus });
    this.counters = counters;
  }

  async generate(restaurant, orderType, now = new Date()) {
    const timezone = restaurant?.settings?.timezone || 'Asia/Kolkata';
    const stamp = dateStamp(now, timezone);
    const restaurantId = restaurant.id ?? String(restaurant._id);
    const sequence = await this.counters.next(counterKey(restaurantId, stamp));
    return buildOrderNumber({ prefix: resolvePrefix(restaurant), orderType, stamp, sequence });
  }
}

export const orderNumberService = new OrderNumberService();
export default orderNumberService;
