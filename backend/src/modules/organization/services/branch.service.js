import { BaseService } from '#core/service/base.service.js';
import { NotFoundError } from '#core/errors/app-error.js';

import { ORG_ERRORS } from '../constants/organization.constants.js';
import { toBranchDTO } from '../dto/organization.dto.js';
import { BranchCreatedEvent, BranchUpdatedEvent } from '../events/organization.events.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { assertOrganizationAccess } from '../utils/tenant-context.js';
import { entityId } from '../utils/id.util.js';

import { restaurantService } from './restaurant.service.js';

/**
 * Branch management, tenant-scoped. Every branch belongs to a restaurant within
 * an organization; access is always checked against the caller's tenant context.
 */
export class BranchService extends BaseService {
  constructor({ branches = branchRepository, restaurants = restaurantService, eventBus } = {}) {
    super({ name: 'org.branch', eventBus });
    this.branches = branches;
    this.restaurants = restaurants;
  }

  async #getOrThrow(id) {
    const branch = await this.branches.findById(id);
    if (!branch) throw new NotFoundError(ORG_ERRORS.BRANCH_NOT_FOUND);
    return branch;
  }

  async createBranch(tenant, data, actorId = null) {
    const restaurant = await this.restaurants.resolveForTenant(tenant, data.restaurantId);
    const branch = await this.branches.create({
      organizationId: restaurant.organizationId,
      restaurantId: entityId(restaurant),
      name: data.name,
      code: data.code ?? '',
      address: data.address ?? {},
      businessHours: data.businessHours ?? [],
      settings: data.settings ?? {},
      managerUserId: data.managerUserId ?? null,
    });
    await this.events.publish(
      new BranchCreatedEvent({
        organizationId: String(restaurant.organizationId),
        restaurantId: entityId(restaurant),
        branchId: entityId(branch),
      }),
    );
    this.audit.success('branch.created', { actorId, targetId: entityId(branch) });
    return toBranchDTO(branch);
  }

  async listBranches(tenant, restaurantId, query = {}) {
    const restaurant = await this.restaurants.resolveForTenant(tenant, restaurantId);
    const page = await this.branches.paginate({
      filter: { restaurantId: entityId(restaurant) },
      search: query.search,
      sort: query.sort,
      pagination: { page: query.page, limit: query.limit },
      // Include the trusted scope field so buildFilter cannot strip it (which
      // would list every restaurant's branches).
      allowedFilterFields: ['status', 'restaurantId'],
    });
    return this.paginated(page, toBranchDTO);
  }

  async getBranch(tenant, id) {
    const branch = await this.#getOrThrow(id);
    assertOrganizationAccess(tenant, String(branch.organizationId));
    return toBranchDTO(branch);
  }

  /**
   * Trusted read of a branch by id WITHOUT a tenant check. For internal server
   * flows already authorized by other means (e.g. the QR Ordering gateway
   * validating a signed QR token bound to this branch). Returns null if absent.
   */
  async getPublicById(id) {
    const branch = await this.branches.findById(id);
    return branch ? toBranchDTO(branch) : null;
  }

  /**
   * Trusted read of a branch by its PUBLIC slug, no tenant check — the customer
   * app addresses branches by slug (/r/:slug), so opening an ordering session
   * from a typed table number resolves the branch here. Returns null if absent.
   */
  async getPublicBySlug(slug) {
    const branch = await this.branches.findOne({ slug: String(slug ?? '').toLowerCase() });
    return branch ? toBranchDTO(branch) : null;
  }

  async updateBranch(tenant, id, data, actorId = null) {
    const branch = await this.#getOrThrow(id);
    assertOrganizationAccess(tenant, String(branch.organizationId));
    const patch = { ...data };
    if (data.address) patch.address = { ...(branch.address ?? {}), ...data.address };
    if (data.settings) patch.settings = { ...(branch.settings ?? {}), ...data.settings };
    const updated = await this.branches.updateById(id, patch);
    await this.events.publish(
      new BranchUpdatedEvent({ branchId: id, changes: Object.keys(patch) }),
    );
    this.audit.success('branch.updated', { actorId, targetId: id });
    return toBranchDTO(updated);
  }

  async updateBusinessHours(tenant, id, businessHours, actorId = null) {
    const branch = await this.#getOrThrow(id);
    assertOrganizationAccess(tenant, String(branch.organizationId));
    const updated = await this.branches.updateById(id, { businessHours });
    await this.events.publish(new BranchUpdatedEvent({ branchId: id, changes: ['businessHours'] }));
    this.audit.success('branch.business_hours.updated', { actorId, targetId: id });
    return toBranchDTO(updated);
  }

  async deleteBranch(tenant, id, actorId = null) {
    const branch = await this.#getOrThrow(id);
    assertOrganizationAccess(tenant, String(branch.organizationId));
    await this.branches.softDeleteById(id);
    this.audit.success('branch.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }

  /**
   * Write a branch's DERIVED discovery rating. Trusted seam for the Customer
   * module, which owns the feedback these are computed from.
   */
  async applyRatingSystem(branchId, { rating, ratingCount }) {
    await this.branches.updateById(String(branchId), {
      'discovery.rating': rating,
      'discovery.ratingCount': ratingCount,
    });
  }
}

export const branchService = new BranchService();
export default branchService;
