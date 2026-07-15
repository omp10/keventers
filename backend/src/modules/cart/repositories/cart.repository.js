import { BaseRepository } from '#core/repository/base.repository.js';

import { CART_STATUS } from '../constants/cart.constants.js';
import { Cart } from '../models/cart.model.js';

/**
 * Cart repository — the only MongoDB access for carts. Every query is scoped by
 * organization + restaurant + branch + guest session (the cart's owner), so a
 * guest can never read or mutate another session's cart. Writes are
 * OPTIMISTICALLY versioned to prevent concurrent-device overwrites.
 *
 * @typedef {object} CartScope
 * @property {string} organizationId
 * @property {string} restaurantId
 * @property {string} branchId
 * @property {string} sessionId
 */
export class CartRepository extends BaseRepository {
  constructor(model = Cart) {
    super(model, { softDelete: false });
  }

  #scoped(scope, filter = {}) {
    return {
      ...filter,
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      branchId: scope.branchId,
      sessionId: scope.sessionId,
    };
  }

  /** The session's single active cart (or null). */
  findActiveBySession(scope) {
    return this.findOne(this.#scoped(scope, { status: CART_STATUS.ACTIVE }));
  }

  /** A specific cart, scoped to the owning session (isolation). */
  findByIdForSession(scope, id) {
    return this.findOne(this.#scoped(scope, { _id: id }));
  }

  createScoped(scope, data) {
    return this.create({
      ...data,
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      branchId: scope.branchId,
      sessionId: scope.sessionId,
    });
  }

  /**
   * Optimistic write: applies `patch` only if the stored version still equals
   * `expectedVersion`, incrementing it atomically. Returns the updated cart, or
   * null on a version conflict (another device won the race).
   */
  async updateWithVersion(id, expectedVersion, patch) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, version: expectedVersion },
      { $set: patch, $inc: { version: 1 } },
      { new: true, runValidators: true },
    );
    return this.toDomain(doc);
  }

  /** Unconditional status/field update (internal lifecycle transitions). */
  updateById(id, patch, options = {}) {
    return super.updateById(id, patch, options);
  }

  /** The active cart for a session id (used by session-event handlers that only
   * carry a sessionId). Session ids are unguessable, so this is safe. */
  findActiveBySessionId(sessionId) {
    return this.findOne({ sessionId, status: CART_STATUS.ACTIVE });
  }

  /**
   * The cart the Order Engine should check out: the ACTIVE cart, or (if a prior
   * attempt already locked it) the most recent LOCKED/CHECKOUT_PENDING cart.
   */
  async findForCheckout(scope) {
    const active = await this.findActiveBySession(scope);
    if (active) return active;
    const docs = await this.find(
      this.#scoped(scope, { status: { $in: [CART_STATUS.LOCKED, CART_STATUS.CHECKOUT_PENDING] } }),
      { sort: '-createdAt', limit: 1 },
    );
    return docs[0] ?? null;
  }

  /** Carts past their expiry still in a live-but-editable state (sweep). */
  findStaleForExpiry(now, limit = 100) {
    return this.find(
      { status: CART_STATUS.ACTIVE, expiresAt: { $lte: now } },
      { limit },
    );
  }
}

export const cartRepository = new CartRepository();
export default cartRepository;
