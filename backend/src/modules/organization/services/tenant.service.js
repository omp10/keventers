import { cacheService } from '#core/cache/cache.service.js';

import { ORG_CACHE } from '../constants/organization.constants.js';
import { membershipRepository } from '../repositories/membership.repository.js';
import { buildTenantContext } from '../utils/tenant-context.js';

/**
 * Resolves the tenant context for an authenticated principal from their active
 * memberships. Results are cached briefly (memberships change rarely) and
 * invalidated when a membership is created/changed.
 */
export class TenantService {
  constructor({ memberships = membershipRepository, cache = cacheService } = {}) {
    this.memberships = memberships;
    this.cache = cache;
  }

  #key(userId) {
    return `${ORG_CACHE.MEMBERSHIP_PREFIX}:${userId}`;
  }

  async #loadMemberships(userId) {
    return this.cache.getOrSet(this.#key(userId), ORG_CACHE.MEMBERSHIP_TTL_SECONDS, () =>
      this.memberships.findActiveByUser(userId),
    );
  }

  /**
   * @param {{ id: string, roles?: string[] }} principal
   * @returns {Promise<import('../utils/tenant-context.js').TenantContext>}
   */
  async resolveForPrincipal(principal) {
    if (!principal?.id) {
      return buildTenantContext({ principal, memberships: [] });
    }
    const memberships = await this.#loadMemberships(principal.id);
    return buildTenantContext({ principal, memberships });
  }

  /** Drop cached memberships for a user (call after membership changes). */
  async invalidate(userId) {
    await this.cache.del(this.#key(userId));
  }
}

export const tenantService = new TenantService();
export default tenantService;
