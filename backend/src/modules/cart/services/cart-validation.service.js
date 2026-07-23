import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, ForbiddenError } from '#core/errors/app-error.js';
import { productService, pricingService as catalogPricing } from '#modules/catalog/index.js';
import {
  BRANCH_STATUS,
  RESTAURANT_STATUS,
  branchService,
  restaurantService,
} from '#modules/organization/index.js';
import {
  LIVE_SESSION_STATUSES,
  isBranchOpen,
  sessionService,
} from '#modules/qr-ordering/index.js';
import { Money } from '#modules/pricing/index.js';

import { CART_ERRORS } from '../constants/cart.constants.js';

/**
 * Cart validation — the guard before any item enters the cart. Validates the
 * ordering context (restaurant + branch + business hours + live guest session)
 * and resolves a requested line against the CATALOG (product/variant/modifier/
 * add-on existence + availability + rules), returning a fully-priced item
 * SNAPSHOT (integer minor units) so later catalog changes never mutate it.
 * Catalog is accessed ONLY through its services — never its models.
 */
export class CartValidationService extends BaseService {
  constructor({
    products = productService,
    catalogPrices = catalogPricing,
    restaurants = restaurantService,
    branches = branchService,
    sessions = sessionService,
    eventBus,
  } = {}) {
    super({ name: 'cart.validation', eventBus });
    this.products = products;
    this.catalogPrices = catalogPrices;
    this.restaurants = restaurants;
    this.branches = branches;
    this.sessions = sessions;
  }

  /** Validate restaurant status, branch status, business hours and the session. */
  async validateOrderingContext(scope, now = new Date()) {
    const restaurant = await this.restaurants.getPublicProfile(scope.restaurantId);
    if (!restaurant || restaurant.status !== RESTAURANT_STATUS.ACTIVE) {
      throw new ForbiddenError(CART_ERRORS.RESTAURANT_UNAVAILABLE);
    }
    const branch = await this.branches.getPublicById(scope.branchId);
    if (!branch || branch.status !== BRANCH_STATUS.ACTIVE) {
      throw new ForbiddenError(CART_ERRORS.BRANCH_UNAVAILABLE);
    }
    const timezone = branch.settings?.timezone || restaurant.settings?.timezone || 'Asia/Kolkata';
    if (!isBranchOpen(branch.businessHours, timezone, now).open) {
      throw new ForbiddenError(CART_ERRORS.BRANCH_CLOSED);
    }
    await this.#assertSessionLive(scope.sessionId);
    return { restaurant, branch };
  }

  async #assertSessionLive(sessionId) {
    let session;
    try {
      session = await this.sessions.getPublicSession(sessionId);
    } catch {
      throw new ForbiddenError(CART_ERRORS.SESSION_INVALID);
    }
    if (!session || !LIVE_SESSION_STATUSES.includes(session.status)) {
      throw new ForbiddenError(CART_ERRORS.SESSION_INVALID);
    }
  }

  /**
   * Resolve + validate a requested line item against the catalog, returning the
   * CartItem to persist (with a frozen price snapshot).
   *
   * @param {object} scope   { organizationId, restaurantId, ... }
   * @param {object} input   { productId, variantId?, modifierIds?, addonIds?, quantity, specialInstructions?, notes? }
   * @param {string} currency
   */
  async resolveItem(scope, input, currency) {
    const detail = await this.products.getForOrdering(scope, input.productId);
    if (!detail) throw new BadRequestError(CART_ERRORS.PRODUCT_UNAVAILABLE);
    // Catalog explains WHY it refused (unpublished / sold out / outside its
    // serving window). Pass that through verbatim — "available only 08:00–11:00"
    // tells the guest what to do; "not available" tells them nothing.
    if (detail.unavailable) throw new BadRequestError(detail.reason || CART_ERRORS.PRODUCT_UNAVAILABLE);

    const variant = this.#resolveVariant(detail, input.variantId);
    const modifiers = this.#resolveModifiers(detail, input.modifierIds ?? []);
    const addons = this.#resolveAddons(detail, input.addonIds ?? []);

    // --- prices (catalog is the authority; convert major → integer minor) ---
    const baseMajor = this.catalogPrices.resolvePrice(detail, {}).price;
    const base = Money.fromMajor(baseMajor, currency);
    let variantDelta = Money.zero(currency);
    if (variant) {
      const variantMajor = this.catalogPrices.resolvePrice(detail, { variant }).price;
      variantDelta = Money.fromMajor(variantMajor, currency).subtract(base);
    }
    const modifierMoneys = modifiers.map((m) => Money.fromMajor(m.price ?? 0, currency));
    const addonMoneys = addons.map((a) => Money.fromMajor(a.price ?? 0, currency));

    const modifiersTotal = Money.sum(modifierMoneys, currency);
    const addonsTotal = Money.sum(addonMoneys, currency);
    const unitPrice = base.add(variantDelta).add(modifiersTotal).add(addonsTotal);
    const quantity = Math.max(1, Math.trunc(input.quantity ?? 1));

    return {
      productId: detail.id,
      productSnapshot: {
        name: detail.name,
        slug: detail.slug,
        sku: detail.sku ?? null,
        thumbnailUrl: detail.thumbnailUrl ?? null,
        categoryId: detail.categoryId ?? null,
      },
      variantId: variant?.id ?? null,
      variantSnapshot: variant ? { name: variant.name } : { name: '' },
      modifiers: modifiers.map((m, i) => ({
        groupId: m.groupId,
        groupName: m.groupName,
        modifierId: m.id,
        name: m.name,
        unitPrice: modifierMoneys[i].amount,
      })),
      addons: addons.map((a, i) => ({
        addonId: a.id,
        name: a.name,
        unitPrice: addonMoneys[i].amount,
      })),
      quantity,
      specialInstructions: input.specialInstructions ?? '',
      notes: input.notes ?? '',
      pricing: {
        currency,
        base: base.amount,
        variant: variantDelta.amount,
        modifiersTotal: modifiersTotal.amount,
        addonsTotal: addonsTotal.amount,
        unitPrice: unitPrice.amount,
        capturedAt: new Date(),
      },
      lineSubtotal: unitPrice.multiply(quantity).amount,
    };
  }

  #resolveVariant(detail, variantId) {
    const variants = detail.variants ?? [];
    if (variantId) {
      const v = variants.find((x) => String(x.id) === String(variantId));
      if (!v) throw new BadRequestError(CART_ERRORS.VARIANT_INVALID);
      if (v.isAvailable === false || (v.status && v.status !== 'active')) {
        throw new BadRequestError(CART_ERRORS.VARIANT_INVALID);
      }
      return v;
    }
    // A product WITH variants requires a selection.
    if (detail.hasVariants && variants.length > 0) {
      throw new BadRequestError(CART_ERRORS.VARIANT_REQUIRED);
    }
    return null;
  }

  #resolveModifiers(detail, modifierIds) {
    const groups = detail.modifierGroups ?? [];
    const chosen = [];
    const perGroupCount = new Map();

    for (const modifierId of modifierIds) {
      let found = null;
      for (const g of groups) {
        const mod = (g.modifiers ?? []).find((m) => String(m.id) === String(modifierId));
        if (mod) {
          if (mod.isAvailable === false) throw new BadRequestError(CART_ERRORS.MODIFIER_INVALID);
          found = { ...mod, groupId: g.id, groupName: g.name };
          perGroupCount.set(g.id, (perGroupCount.get(g.id) ?? 0) + 1);
          break;
        }
      }
      if (!found) throw new BadRequestError(CART_ERRORS.MODIFIER_INVALID);
      chosen.push(found);
    }

    // Enforce per-group min/max/required rules.
    for (const g of groups) {
      const count = perGroupCount.get(g.id) ?? 0;
      const min = g.minSelection ?? 0;
      const max = g.maxSelection ?? null;
      if (g.isRequired && count < Math.max(1, min)) {
        throw new BadRequestError(CART_ERRORS.MODIFIER_RULES);
      }
      if (count < min) throw new BadRequestError(CART_ERRORS.MODIFIER_RULES);
      if (max != null && count > max) throw new BadRequestError(CART_ERRORS.MODIFIER_RULES);
    }
    return chosen;
  }

  #resolveAddons(detail, addonIds) {
    const available = detail.addons ?? [];
    return addonIds.map((addonId) => {
      const a = available.find((x) => String(x.id) === String(addonId));
      if (!a || a.isAvailable === false) throw new BadRequestError(CART_ERRORS.ADDON_INVALID);
      return a;
    });
  }
}

export const cartValidationService = new CartValidationService();
export default cartValidationService;
