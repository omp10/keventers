import { NotificationPreference } from '../models/notification-preference.model.js';

import { NotificationScopedRepository } from './notification-scoped.repository.js';

/** Notification preference repository (one row per user per restaurant). */
export class PreferenceRepository extends NotificationScopedRepository {
  constructor(model = NotificationPreference) {
    super(model, { softDelete: false });
  }

  findByUser(scope, userId) {
    return this.findOne({ organizationId: scope.organizationId, restaurantId: scope.restaurantId, userId });
  }

  /** Atomic find-or-create so first-access never races into duplicates. */
  async ensureForUser(scope, userId, onInsert = {}) {
    const filter = { organizationId: scope.organizationId, restaurantId: scope.restaurantId, userId };
    const doc = await this.model.findOneAndUpdate(
      filter,
      { $setOnInsert: { ...filter, ...onInsert } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return this.toDomain(doc);
  }

  updateForUser(scope, userId, patch) {
    return this.model
      .findOneAndUpdate(
        { organizationId: scope.organizationId, restaurantId: scope.restaurantId, userId },
        { $set: patch },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .then((d) => this.toDomain(d));
  }
}

export const preferenceRepository = new PreferenceRepository();
export default preferenceRepository;
