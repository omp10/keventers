import { BaseService } from '#core/service/base.service.js';
import { ConflictError, NotFoundError } from '#core/errors/app-error.js';

import { ORGANIZATION_STATUS, ORG_ERRORS } from '../constants/organization.constants.js';
import { toOrganizationDTO } from '../dto/organization.dto.js';
import {
  OrganizationActivatedEvent,
  OrganizationSuspendedEvent,
} from '../events/organization.events.js';
import { organizationRepository } from '../repositories/organization.repository.js';
import { assertOrganizationAccess } from '../utils/tenant-context.js';
import { entityId } from '../utils/id.util.js';
import { uniqueSlug } from '../utils/slug.util.js';

import { subscriptionService } from './subscription.service.js';

/**
 * Organization administration (Platform Super Admin). Tenant-aware reads so an
 * org admin resolving their own organization can never see another's.
 */
export class OrganizationService extends BaseService {
  constructor({ organizations = organizationRepository, subscriptions = subscriptionService, eventBus } = {}) {
    super({ name: 'org.organization', eventBus });
    this.organizations = organizations;
    this.subscriptions = subscriptions;
  }

  async #getOrThrow(id) {
    const org = await this.organizations.findById(id);
    if (!org) throw new NotFoundError(ORG_ERRORS.ORGANIZATION_NOT_FOUND);
    return org;
  }

  async listOrganizations(query = {}, tenant = { isSuperAdmin: true }) {
    const filter = {};
    if (query.status) filter.status = query.status;
    // Non-super-admins only ever see their own organizations.
    if (!tenant.isSuperAdmin) filter._id = { $in: tenant.organizationIds ?? [] };

    const page = await this.organizations.paginate({
      filter,
      search: query.search,
      sort: query.sort,
      pagination: { page: query.page, limit: query.limit },
      // Include `_id` so a non-super-admin's org-restriction ({_id:{$in}}) is
      // never stripped by buildFilter (which would list every organization).
      allowedFilterFields: ['status', '_id'],
    });
    return this.paginated(page, toOrganizationDTO);
  }

  async getOrganization(id, tenant) {
    const org = await this.#getOrThrow(id);
    assertOrganizationAccess(tenant, entityId(org));
    return toOrganizationDTO(org);
  }

  async createOrganization(data, actorId = null) {
    const slug = await uniqueSlug(data.name, (s) => this.organizations.existsBySlug(s));
    const org = await this.organizations.create({
      name: data.name,
      slug,
      brandName: data.brandName ?? '',
      ownerUserId: data.ownerUserId,
      status: ORGANIZATION_STATUS.ONBOARDING,
      contact: data.contact ?? {},
      subscription: this.subscriptions.buildTrialSubscription(),
    });
    this.audit.success('organization.created', { actorId, targetId: entityId(org) });
    return toOrganizationDTO(org);
  }

  async updateOrganization(id, data, tenant, actorId = null) {
    const org = await this.#getOrThrow(id);
    assertOrganizationAccess(tenant, entityId(org));
    const patch = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.brandName !== undefined) patch.brandName = data.brandName;
    if (data.contact !== undefined) patch.contact = { ...(org.contact ?? {}), ...data.contact };
    if (data.settings !== undefined) patch.settings = { ...(org.settings ?? {}), ...data.settings };
    const updated = await this.organizations.updateById(id, patch);
    this.audit.success('organization.updated', { actorId, targetId: id });
    return toOrganizationDTO(updated);
  }

  async suspend(id, { reason } = {}, actorId = null) {
    const org = await this.#getOrThrow(id);
    if (org.status === ORGANIZATION_STATUS.SUSPENDED) {
      throw new ConflictError(ORG_ERRORS.INVALID_TRANSITION);
    }
    const updated = await this.organizations.updateById(id, {
      status: ORGANIZATION_STATUS.SUSPENDED,
      suspendedAt: new Date(),
      suspensionReason: reason ?? '',
    });
    await this.events.publish(new OrganizationSuspendedEvent({ organizationId: id, reason }));
    this.audit.success('organization.suspended', { actorId, targetId: id, metadata: { reason } });
    return toOrganizationDTO(updated);
  }

  async activate(id, actorId = null) {
    await this.#getOrThrow(id);
    const updated = await this.organizations.updateById(id, {
      status: ORGANIZATION_STATUS.ACTIVE,
      suspendedAt: null,
      suspensionReason: '',
    });
    await this.events.publish(new OrganizationActivatedEvent({ organizationId: id }));
    this.audit.success('organization.activated', { actorId, targetId: id });
    return toOrganizationDTO(updated);
  }

  async deleteOrganization(id, actorId = null) {
    await this.#getOrThrow(id);
    await this.organizations.softDeleteById(id);
    this.audit.success('organization.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
