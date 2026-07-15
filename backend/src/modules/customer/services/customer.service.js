import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import { distributedLock } from '#core/cache/distributed-lock.js';
import { config } from '#config';
import { userService } from '#modules/identity/index.js';

import {
  ACCOUNT_STATUS,
  CUSTOMER_ERRORS,
  CUSTOMER_ORIGIN,
  LOYALTY_SOURCE,
  REDIS_KEYS,
  TIMELINE_EVENT,
} from '../constants/customer.constants.js';
import { toAddressDTO, toCustomerDTO, toCustomerSummaryDTO, toPreferencesDTO } from '../dto/customer.dto.js';
import {
  CustomerCreatedEvent,
  CustomerDeletedEvent,
  CustomerMergedEvent,
  CustomerUpdatedEvent,
} from '../events/customer.events.js';
import { customerRepository } from '../repositories/customer.repository.js';
import { customerAddressRepository } from '../repositories/customer-address.repository.js';
import { customerRedisStore } from '../stores/customer-redis.store.js';
import { entityId } from '../utils/id.util.js';
import { assertStaffAccess, loadForStaff, resolveRestaurantScope } from '../utils/tenant.util.js';

import { loyaltyService } from './loyalty.service.js';

/**
 * Customer service. Owns the customer lifecycle: idempotent guest→customer
 * materialization (`ensureCustomer`), account linking/merge (history-preserving),
 * profile + preferences + addresses, and GDPR-ready deletion. It NEVER calls the
 * source services for the events it reacts to — analytics projections and loyalty
 * are driven through their own services. Profile reads are cached.
 */
export class CustomerService extends BaseService {
  constructor({
    customers = customerRepository,
    addresses = customerAddressRepository,
    loyalty = loyaltyService,
    users = userService,
    store = customerRedisStore,
    lock = distributedLock,
    resolveScope = resolveRestaurantScope,
    analytics = null, // injected lazily to avoid an import cycle; set by the module
    eventBus,
  } = {}) {
    super({ name: 'customer', eventBus });
    this.customers = customers;
    this.addresses = addresses;
    this.loyalty = loyalty;
    this.users = users;
    this.store = store;
    this.lock = lock;
    this.resolveScope = resolveScope;
    this.analytics = analytics;
  }

  /** Late-bind the analytics service (module composition sets this). */
  useAnalytics(analytics) {
    this.analytics = analytics;
    return this;
  }

  // ==================== MATERIALIZATION / MERGE ====================

  /**
   * Idempotently find-or-create the customer for (scope, userId). On creation it
   * snapshots the identity profile, opens a loyalty account (+ signup bonus) and
   * publishes CustomerCreated. Safe to call on every authenticated access.
   */
  async ensureCustomer(scope, userId, { origin = CUSTOMER_ORIGIN.REGISTERED, sessionId = null } = {}) {
    const profile = await this.#profileSnapshot(userId);
    const { customer, created } = await this.customers.upsertForUser(scope, userId, {
      origin,
      originSessionId: sessionId,
      displayName: profile.displayName,
      email: profile.email,
      phone: profile.phone,
      timeline: [{ at: new Date(), event: TIMELINE_EVENT.REGISTERED, detail: { origin } }],
    });
    const customerId = entityId(customer);
    await this.loyalty.ensureAccount(scope, customerId, userId);

    if (created) {
      const bonus = config.customer.loyalty.signupBonusPoints;
      if (bonus > 0) {
        await this.loyalty.grantBonus({ scope, customerId, userId, points: bonus, source: { type: LOYALTY_SOURCE.SIGNUP, id: customerId }, reason: 'signup_bonus' }).catch((err) => this.logger.warn({ err }, 'signup bonus failed (continuing)'));
      }
      await this.events.publish(new CustomerCreatedEvent({ customerId, userId: String(userId), organizationId: scope.organizationId, restaurantId: scope.restaurantId, origin }));
      this.audit.success('customer.created', { targetId: customerId, metadata: { origin } });
    }
    return { customer, customerId, created };
  }

  /**
   * Link a guest session to a registered customer and merge history. Idempotent
   * and history-preserving: orders were already re-attributed by the Order module
   * on the same `session.linked_account` event, so here we ensure the customer,
   * record the merge in the immutable timeline, and re-project analytics from the
   * customer's authoritative order history (one-time, not per request).
   */
  async linkFromSession(scope, { sessionId, userId }) {
    return this.lock.withLock(`${REDIS_KEYS.MERGE_LOCK}:${scope.restaurantId}:${userId}`, async () => {
      const { customer, customerId, created } = await this.ensureCustomer(scope, userId, { origin: CUSTOMER_ORIGIN.GUEST_SESSION, sessionId });
      await this.customers.updateById(customerId, { originSessionId: sessionId });
      await this.customers.pushTimeline(customerId, { at: new Date(), event: TIMELINE_EVENT.MERGED, detail: { sessionId } }, config.customer.limits.timeline);
      // Re-project analytics from the authoritative order history (idempotent SET).
      if (this.analytics) await this.analytics.recomputeForCustomer(scope, customer).catch((err) => this.logger.warn({ err }, 'merge analytics recompute failed (continuing)'));
      await this.store.invalidateProfile(customerId);
      await this.events.publish(new CustomerMergedEvent({ customerId, userId: String(userId), sessionId: String(sessionId), restaurantId: scope.restaurantId, created }));
      this.audit.success('customer.merged', { targetId: customerId, metadata: { sessionId } });
      return { customerId, created };
    }, { ttlMs: config.customer.loyalty.lockTtlMs });
  }

  async #profileSnapshot(userId) {
    const user = await this.users.getUser(userId).catch(() => null);
    return {
      displayName: user?.displayName ?? user?.fullName ?? user?.name ?? null,
      email: user?.email ?? null,
      phone: user?.phone ?? user?.phoneNumber ?? null,
    };
  }

  #assertActive(customer) {
    if (!customer || customer.accountStatus !== ACCOUNT_STATUS.ACTIVE) throw new ForbiddenError(CUSTOMER_ERRORS.ACCOUNT_INACTIVE);
  }

  // ==================== CUSTOMER-FACING ====================

  async getProfile(customerScope) {
    const { customer, customerId } = await this.ensureCustomer(
      { organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId },
      customerScope.userId,
    );
    const cached = await this.store.getProfile(customerId);
    if (cached) return cached;
    const dto = toCustomerDTO(customer);
    await this.store.setProfile(customerId, dto, config.customer.cache.profileTtlSeconds);
    return dto;
  }

  async updateProfile(customerScope, data) {
    const { customer, customerId } = await this.ensureCustomer(
      { organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId },
      customerScope.userId,
    );
    this.#assertActive(customer);
    const patch = {};
    if (data.displayName !== undefined) patch.displayName = data.displayName;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.marketingOptIn !== undefined) patch['marketing.optedIn'] = Boolean(data.marketingOptIn);
    const updated = await this.customers.updateById(customerId, patch);
    await this.store.invalidateProfile(customerId);
    await this.events.publish(new CustomerUpdatedEvent({ customerId, restaurantId: customerScope.restaurantId, fields: Object.keys(patch) }));
    this.audit.success('customer.updated', { targetId: customerId, actorId: customerScope.userId });
    return toCustomerDTO(updated);
  }

  async getPreferences(customerScope) {
    const { customer } = await this.ensureCustomer({ organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId }, customerScope.userId);
    return toPreferencesDTO(customer.preferences);
  }

  async updatePreferences(customerScope, data) {
    const { customerId } = await this.ensureCustomer({ organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId }, customerScope.userId);
    const patch = {};
    for (const key of ['favoriteProductIds', 'favoriteCategoryIds', 'dietary', 'allergies', 'language']) {
      if (data[key] !== undefined) patch[`preferences.${key}`] = data[key];
    }
    if (data.notifications !== undefined) {
      for (const [k, v] of Object.entries(data.notifications)) patch[`preferences.notifications.${k}`] = Boolean(v);
    }
    const updated = await this.customers.updateById(customerId, patch);
    await this.store.invalidateProfile(customerId);
    this.audit.success('customer.preferences.updated', { targetId: customerId, actorId: customerScope.userId });
    return toPreferencesDTO(updated.preferences);
  }

  // ==================== ADDRESSES ====================

  async listAddresses(customerScope) {
    const { customerId } = await this.ensureCustomer({ organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId }, customerScope.userId);
    const rows = await this.addresses.findForCustomer(customerId);
    return rows.map(toAddressDTO);
  }

  async addAddress(customerScope, data) {
    const scope = { organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId };
    const { customerId } = await this.ensureCustomer(scope, customerScope.userId);
    if (data.isDefault) await this.addresses.clearDefaults(customerId);
    const geo = data.lat != null && data.lng != null ? { type: 'Point', coordinates: [data.lng, data.lat] } : undefined;
    const address = await this.addresses.createScoped(scope, { ...this.#addressFields(data), customerId, geo });
    this.audit.success('customer.address.added', { targetId: entityId(address), actorId: customerScope.userId });
    return toAddressDTO(address);
  }

  async updateAddress(customerScope, addressId, data) {
    const { customerId } = await this.ensureCustomer({ organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId }, customerScope.userId);
    const address = await this.addresses.findById(addressId);
    if (!address || String(address.customerId) !== String(customerId) || address.deletedAt) throw new NotFoundError(CUSTOMER_ERRORS.ADDRESS_NOT_FOUND);
    if (data.isDefault) await this.addresses.clearDefaults(customerId);
    const patch = this.#addressFields(data, { partial: true });
    if (data.lat != null && data.lng != null) patch.geo = { type: 'Point', coordinates: [data.lng, data.lat] };
    const updated = await this.addresses.updateById(addressId, patch);
    return toAddressDTO(updated);
  }

  async removeAddress(customerScope, addressId) {
    const { customerId } = await this.ensureCustomer({ organizationId: customerScope.organizationId, restaurantId: customerScope.restaurantId }, customerScope.userId);
    const address = await this.addresses.findById(addressId);
    if (!address || String(address.customerId) !== String(customerId) || address.deletedAt) throw new NotFoundError(CUSTOMER_ERRORS.ADDRESS_NOT_FOUND);
    await this.addresses.softDeleteById(addressId);
    return { id: addressId, deleted: true };
  }

  #addressFields(data, { partial = false } = {}) {
    const out = {};
    const fields = ['type', 'label', 'contactName', 'contactPhone', 'line1', 'line2', 'landmark', 'city', 'state', 'postalCode', 'country', 'isDefault'];
    for (const f of fields) {
      if (!partial || data[f] !== undefined) out[f] = data[f];
    }
    return out;
  }

  // ==================== STAFF / ADMIN ====================

  async listForStaff(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const filter = {};
    if (query.accountStatus) filter.accountStatus = query.accountStatus;
    if (query.origin) filter.origin = query.origin;
    const page = await this.customers.paginateForStaff(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toCustomerSummaryDTO);
  }

  async getForStaff(tenant, id) {
    const customer = await loadForStaff(this.customers, tenant, id, CUSTOMER_ERRORS.CUSTOMER_NOT_FOUND);
    const loyalty = await this.loyalty.getAccountForCustomer(
      { organizationId: String(customer.organizationId), restaurantId: String(customer.restaurantId) },
      entityId(customer),
      customer.userId,
    );
    return { ...toCustomerDTO(customer, { forStaff: true }), loyalty };
  }

  /**
   * Staff/admin manual loyalty adjustment. Enforces tenant isolation on the
   * target customer, then delegates the ledger write to the loyalty engine. The
   * scope is derived from the customer record — never from client input.
   */
  async adjustLoyalty(tenant, customerId, { points, reason }, actorId = null) {
    const customer = await loadForStaff(this.customers, tenant, customerId, CUSTOMER_ERRORS.CUSTOMER_NOT_FOUND);
    const scope = { organizationId: String(customer.organizationId), restaurantId: String(customer.restaurantId) };
    return this.loyalty.adjust({ scope, customerId: entityId(customer), userId: customer.userId, points, reason, actorId });
  }

  async getLedgerForStaff(tenant, customerId, query = {}) {
    const customer = await loadForStaff(this.customers, tenant, customerId, CUSTOMER_ERRORS.CUSTOMER_NOT_FOUND);
    return this.loyalty.getLedgerForCustomer(entityId(customer), query);
  }

  // ==================== GDPR / LIFECYCLE ====================

  /**
   * GDPR erasure: scrub PII but RETAIN the (now-anonymized) record so the
   * immutable financial/loyalty ledgers stay consistent. Reversible-safe:
   * soft-deleted + status DELETED. Audited.
   */
  async gdprErase(tenant, id, actorId = null) {
    const customer = await loadForStaff(this.customers, tenant, id, CUSTOMER_ERRORS.CUSTOMER_NOT_FOUND);
    const customerId = entityId(customer);
    await this.customers.updateById(customerId, {
      displayName: null, email: null, phone: null,
      'marketing.optedIn': false, 'marketing.consents': [],
      tags: [], metadata: {},
      accountStatus: ACCOUNT_STATUS.DELETED,
      gdprErasedAt: new Date(),
      deletedAt: new Date(),
    });
    await this.store.invalidateProfile(customerId);
    await this.events.publish(new CustomerDeletedEvent({ customerId, restaurantId: String(customer.restaurantId), reason: 'gdpr_erasure' }));
    this.audit.success('customer.gdpr_erased', { actorId, targetId: customerId });
    return { id: customerId, erased: true };
  }

  async setAccountStatus(tenant, id, status, actorId = null) {
    if (!Object.values(ACCOUNT_STATUS).includes(status)) throw new BadRequestError(CUSTOMER_ERRORS.ACCOUNT_INACTIVE);
    const customer = await loadForStaff(this.customers, tenant, id, CUSTOMER_ERRORS.CUSTOMER_NOT_FOUND);
    assertStaffAccess(tenant, customer);
    const updated = await this.customers.updateById(entityId(customer), { accountStatus: status });
    await this.store.invalidateProfile(entityId(customer));
    this.audit.success('customer.status_changed', { actorId, targetId: entityId(customer), metadata: { status } });
    return toCustomerDTO(updated, { forStaff: true });
  }
}

export const customerService = new CustomerService();
export default customerService;
