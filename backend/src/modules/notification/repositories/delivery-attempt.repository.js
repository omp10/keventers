import { DeliveryAttempt } from '../models/delivery-attempt.model.js';

import { NotificationScopedRepository } from './notification-scoped.repository.js';

/** Delivery-attempt repository — append-only per-attempt audit trail. */
export class DeliveryAttemptRepository extends NotificationScopedRepository {
  constructor(model = DeliveryAttempt) {
    super(model, { softDelete: false });
  }

  findByNotification(notificationId) {
    return this.find({ notificationId }, { sort: 'attemptNumber' });
  }

  countForNotification(notificationId) {
    return this.count({ notificationId });
  }

  paginateForStaff(scope, params = {}) {
    return this.paginateScoped(scope, { ...params, allowedFilterFields: ['status', 'channel', 'provider', 'notificationId'] });
  }
}

export const deliveryAttemptRepository = new DeliveryAttemptRepository();
export default deliveryAttemptRepository;
