import { BaseService } from '#core/service/base.service.js';

import {
  AVAILABILITY_STATUS,
  CATALOG_ERRORS,
  DAYS_OF_WEEK,
} from '../constants/catalog.constants.js';
import { toProductAvailabilityDTO } from '../dto/catalog.dto.js';
import { ProductAvailabilityChangedEvent } from '../events/catalog.events.js';
import { productAvailabilityRepository } from '../repositories/product-availability.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { entityId } from '../utils/id.util.js';
import { assertCatalogAccess, loadOwned } from '../utils/catalog-tenant.util.js';

/**
 * Availability resolution + branch-specific overrides. Products carry a
 * restaurant-level (default) availability; a ProductAvailability row narrows it
 * for one branch (out-of-stock, holiday, temporary disable, time windows). The
 * `resolveAvailability` helper is pure so ordering/QR can ask "is this sellable
 * now at branch X?" without duplicating the rules. Tenant-scoped.
 */
export class AvailabilityService extends BaseService {
  constructor({
    overrides = productAvailabilityRepository,
    products = productRepository,
    eventBus,
  } = {}) {
    super({ name: 'catalog.availability', eventBus });
    this.overrides = overrides;
    this.products = products;
  }

  /**
   * Pure availability evaluation. Branch override (when present) wins over the
   * product default; both honour time windows.
   * @returns {{ available: boolean, status: string, reason: string }}
   */
  resolveAvailability(product, { override = null, now = null } = {}) {
    const base = product?.availability ?? {};
    const effective = override ?? base;
    const status = effective.status ?? AVAILABILITY_STATUS.AVAILABLE;

    if (status === AVAILABILITY_STATUS.OUT_OF_STOCK) {
      return { available: false, status, reason: effective.reason || 'Out of stock' };
    }
    if (status === AVAILABILITY_STATUS.TEMPORARILY_DISABLED) {
      return { available: false, status, reason: effective.reason || 'Temporarily unavailable' };
    }
    if (override && override.isAvailable === false) {
      return { available: false, status, reason: override.reason || 'Unavailable at this branch' };
    }

    // Holiday / override window.
    if (override && (override.overrideFrom || override.overrideUntil) && now) {
      const at = new Date(now).getTime();
      const from = override.overrideFrom ? new Date(override.overrideFrom).getTime() : -Infinity;
      const until = override.overrideUntil ? new Date(override.overrideUntil).getTime() : Infinity;
      if (at >= from && at <= until && override.isAvailable === false) {
        return { available: false, status, reason: override.reason || 'Unavailable' };
      }
    }

    // Time-based windows (breakfast/lunch/etc).
    const windows = (override?.windows?.length ? override.windows : base.windows) ?? [];
    const scheduled = override ? Boolean(override.windows?.length) : Boolean(base.scheduled);
    if (scheduled && windows.length > 0 && now) {
      const within = this.#withinAnyWindow(windows, now);
      if (!within) {
        return { available: false, status, reason: 'Outside available hours' };
      }
    }

    return { available: true, status: AVAILABILITY_STATUS.AVAILABLE, reason: '' };
  }

  #withinAnyWindow(windows, now) {
    const d = new Date(now);
    const day = DAYS_OF_WEEK[(d.getUTCDay() + 6) % 7]; // JS: 0=Sun → our monday-first list
    const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
    return windows.some((w) => {
      if (Array.isArray(w.days) && w.days.length > 0 && !w.days.includes(day)) return false;
      const start = this.#toMinutes(w.startTime, 0);
      const end = this.#toMinutes(w.endTime, 24 * 60);
      return minutes >= start && minutes <= end;
    });
  }

  #toMinutes(hhmm, fallback) {
    if (!hhmm || typeof hhmm !== 'string') return fallback;
    const [h, m] = hhmm.split(':').map((n) => Number.parseInt(n, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
    return h * 60 + m;
  }

  /** Set/replace the restaurant-level default availability on a product. */
  async setProductAvailability(tenant, productId, data, actorId = null) {
    const product = await loadOwned(this.products, tenant, productId, CATALOG_ERRORS.PRODUCT_NOT_FOUND);
    const availability = {
      status: data.status ?? product.availability?.status ?? AVAILABILITY_STATUS.AVAILABLE,
      scheduled: data.scheduled ?? product.availability?.scheduled ?? false,
      windows: data.windows ?? product.availability?.windows ?? [],
      availableFrom: data.availableFrom ?? product.availability?.availableFrom ?? null,
      unavailableReason: data.unavailableReason ?? product.availability?.unavailableReason ?? '',
    };
    const updated = await this.products.updateById(productId, { availability });
    await this.events.publish(
      new ProductAvailabilityChangedEvent({
        restaurantId: String(product.restaurantId),
        productId,
        status: availability.status,
      }),
    );
    this.audit.success('catalog.product.availability_changed', { actorId, targetId: productId });
    return { productId, availability: updated.availability };
  }

  /** Upsert a branch-specific availability override. */
  async setBranchOverride(tenant, productId, branchId, data, actorId = null) {
    const product = await loadOwned(this.products, tenant, productId, CATALOG_ERRORS.PRODUCT_NOT_FOUND);
    const scope = {
      organizationId: String(product.organizationId),
      restaurantId: String(product.restaurantId),
    };
    const row = await this.overrides.upsertOverride(scope, {
      branchId,
      productId,
      variantId: data.variantId ?? null,
      status: data.status ?? AVAILABILITY_STATUS.AVAILABLE,
      isAvailable: data.isAvailable ?? true,
      windows: data.windows ?? [],
      overrideFrom: data.overrideFrom ?? null,
      overrideUntil: data.overrideUntil ?? null,
      reason: data.reason ?? '',
    });
    await this.events.publish(
      new ProductAvailabilityChangedEvent({
        restaurantId: scope.restaurantId,
        productId,
        branchId: String(branchId),
        status: row.status,
      }),
    );
    this.audit.success('catalog.product.branch_availability_changed', {
      actorId,
      targetId: productId,
      metadata: { branchId: String(branchId) },
    });
    return toProductAvailabilityDTO(row);
  }

  /** List a product's branch overrides. */
  async listOverrides(tenant, productId) {
    const product = await loadOwned(this.products, tenant, productId, CATALOG_ERRORS.PRODUCT_NOT_FOUND);
    const scope = {
      organizationId: String(product.organizationId),
      restaurantId: String(product.restaurantId),
    };
    const rows = await this.overrides.findByProduct(scope, entityId(product));
    rows.forEach((r) => assertCatalogAccess(tenant, r));
    return rows.map(toProductAvailabilityDTO);
  }
}

export const availabilityService = new AvailabilityService();
export default availabilityService;
