import { GuestSession } from '../models/guest-session.model.js';

import { BranchScopedRepository } from './branch-scoped.repository.js';

export class GuestSessionRepository extends BranchScopedRepository {
  constructor(model = GuestSession) {
    // Sessions are historical records — no soft delete (terminal states instead).
    super(model, { softDelete: false, searchableFields: ['sessionId', 'guestName'] });
  }

  /** Global lookup by session id (public session endpoints validate ownership
   * via the guest token, not the tenant context). */
  findBySessionId(sessionId) {
    return this.findOne({ sessionId });
  }

  findByRecoveryCode(recoveryCode) {
    return this.findOne({ recoveryCode });
  }

  updateBySessionId(sessionId, patch, options = {}) {
    return this.model
      .findOneAndUpdate({ sessionId }, { $set: patch }, { new: true, ...(options.session ? { session: options.session } : {}) })
      .then((doc) => this.toDomain(doc));
  }

  /** Live sessions holding a table (used to decide occupancy release). */
  findLiveByTable(tableId, liveStatuses) {
    return this.find({ tableId, status: { $in: liveStatuses } });
  }

  countLiveByTable(tableId, liveStatuses) {
    return this.count({ tableId, status: { $in: liveStatuses } });
  }
}

export const guestSessionRepository = new GuestSessionRepository();
export default guestSessionRepository;
