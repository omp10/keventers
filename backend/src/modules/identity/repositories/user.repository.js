import { BaseRepository } from '#core/repository/base.repository.js';

import { User } from '../models/user.model.js';

/**
 * User data access. The ONLY layer touching the User collection. Contains query
 * intent methods only — no business rules.
 */
export class UserRepository extends BaseRepository {
  constructor(model = User) {
    super(model, {
      softDelete: true,
      searchableFields: ['email', 'firstName', 'lastName', 'phone'],
    });
  }

  findByEmail(email, options = {}) {
    return this.findOne({ email: String(email).toLowerCase() }, options);
  }

  /** Includes the normally-hidden passwordHash — for authentication only. */
  async findByEmailForAuth(email) {
    const doc = await this.model
      .findOne({ email: String(email).toLowerCase(), deletedAt: null })
      .select('+passwordHash');
    return this.toDomain(doc);
  }

  findByPhone(phone, options = {}) {
    return this.findOne({ phone }, options);
  }

  existsByEmail(email) {
    return this.exists({ email: String(email).toLowerCase() });
  }

  existsByPhone(phone) {
    return this.exists({ phone });
  }
}

export const userRepository = new UserRepository();
export default userRepository;
