import { BaseService } from '#core/service/base.service.js';
import { NotFoundError } from '#core/errors/app-error.js';

import { AVAILABILITY_STATUS, CATEGORY_STATUS, ENTITY_STATUS, PRODUCT_STATUS } from '../constants/catalog.constants.js';
import { Addon } from '../models/addon.model.js';
import { Category } from '../models/category.model.js';
import { Modifier } from '../models/modifier.model.js';
import { ModifierGroup } from '../models/modifier-group.model.js';
import { Product } from '../models/product.model.js';
import { Variant } from '../models/variant.model.js';

const id = (doc) => String(doc?._id ?? doc?.id ?? '');

/**
 * Catalog stores prices as plain numbers in the restaurant's currency (major
 * units); the customer app's Money DTO carries both, so the conversion to minor
 * units happens HERE — never in the browser.
 */
const money = (value = 0, currency = 'INR') => ({
  amount: Math.round(Number(value || 0) * 100),
  currency,
  major: Number(value || 0),
});

/** Backend decides what "available" means; the client only renders the answer. */
const isAvailable = (doc) =>
  doc?.availability?.status
    ? doc.availability.status === AVAILABILITY_STATUS.AVAILABLE
    : true;

/** Dietary tags → the client's single veg class. */
function vegClass(tags = []) {
  if (tags.includes('non_vegetarian')) return 'non_veg';
  if (tags.includes('eggetarian')) return 'egg';
  if (tags.includes('vegetarian') || tags.includes('vegan')) return 'veg';
  return undefined;
}

/** The promotional price wins when set and cheaper — resolved server-side. */
function priceOf(product, currency) {
  const base = product.pricing?.basePrice ?? 0;
  const promo = product.pricing?.promotionalPrice;
  const hasPromo = promo != null && promo > 0 && promo < base;
  return {
    price: money(base, currency),
    discountedPrice: hasPromo ? money(promo, currency) : null,
  };
}

function toMenuCategory(category) {
  return {
    id: id(category),
    slug: category.slug,
    name: category.name,
    description: category.description || undefined,
    imageUrl: category.imageUrl || undefined,
    parentId: category.parentId ? String(category.parentId) : null,
    order: category.displayOrder ?? 0,
  };
}

function toProduct(product, { currency, variants = [], groups = [], addons = [] }) {
  const { price, discountedPrice } = priceOf(product, currency);
  const gallery = (product.images ?? []).map((i) => i.url).filter(Boolean);
  const cover = product.heroImageUrl || product.thumbnailUrl || gallery[0];

  const productVariants = variants.map((v) => ({
    id: id(v),
    name: v.name,
    price: money(v.price, currency),
    available: v.status ? v.status === 'active' : true,
    isDefault: Boolean(v.isDefault),
  }));

  // Modifiers live in their own collection; the caller attaches each group's
  // options as `group.modifiers` before mapping.
  const modifierGroups = groups.map((g) => ({
    id: id(g),
    name: g.name,
    min: g.minSelection ?? 0,
    max: g.maxSelection ?? 1,
    required: Boolean(g.isRequired),
    modifiers: (g.modifiers ?? []).map((o) => ({
      id: id(o),
      name: o.name,
      price: money(o.price, currency),
      available: o.status ? o.status === ENTITY_STATUS.ACTIVE : true,
      isDefault: Boolean(o.isDefault),
    })),
  }));

  return {
    id: id(product),
    slug: product.slug,
    name: product.name,
    description: product.description || product.shortDescription || undefined,
    imageUrl: cover || undefined,
    images: gallery.length ? gallery : undefined,
    categoryId: String(product.categoryId),
    price,
    discountedPrice,
    prepTimeMinutes: product.preparationTimeMinutes || undefined,
    veg: vegClass(product.dietaryTags),
    popular: Boolean(product.isPopular ?? product.isFeatured),
    recommended: Boolean(product.isRecommended),
    available: isAvailable(product),
    customizable: productVariants.length > 0 || modifierGroups.length > 0,
    variants: productVariants.length ? productVariants : undefined,
    modifierGroups: modifierGroups.length ? modifierGroups : undefined,
    addons: addons.length
      ? addons.map((a) => ({
          id: id(a),
          name: a.name,
          price: money(a.price, currency),
          available: a.status ? a.status === ENTITY_STATUS.ACTIVE : true,
        }))
      : undefined,
    tags: product.tags?.length ? product.tags : undefined,
  };
}

/**
 * PUBLIC MENU — the customer-facing read of a branch's catalog.
 *
 * Menus are addressed by the BRANCH slug (that's the ordering location), but the
 * catalog itself is restaurant-scoped, so this resolves branch → restaurant →
 * catalog. Everything is public (a guest browses before any session exists) and
 * strictly read-only: prices, availability and promotions are resolved here so
 * the client only renders.
 *
 * The branch lookup is injected rather than imported to avoid a hard dependency
 * on the organization module's internals.
 */
export class PublicMenuService extends BaseService {
  constructor({
    categories = Category,
    products = Product,
    variants = Variant,
    modifierGroups = ModifierGroup,
    modifiers = Modifier,
    addons = Addon,
    branchLookup = null,
    eventBus,
  } = {}) {
    super({ name: 'catalog.public-menu', eventBus });
    this.categories = categories;
    this.products = products;
    this.variants = variants;
    this.modifierGroups = modifierGroups;
    this.modifiers = modifiers;
    this.addons = addons;
    this.branchLookup = branchLookup;
  }

  /** Wire the branch resolver (injected at module bootstrap — see catalog.module). */
  setBranchLookup(lookup) {
    this.branchLookup = lookup;
  }

  /** Resolve the branch (and its restaurant) from a public slug. */
  async #branch(slug) {
    if (!this.branchLookup) throw new NotFoundError('Menu not available');
    const branch = await this.branchLookup(String(slug).toLowerCase());
    if (!branch) throw new NotFoundError('Branch not found');
    return branch;
  }

  #currencyOf(branch) {
    return branch.settings?.currency || 'INR';
  }

  /** Active products for a restaurant, with their variants + modifier groups. */
  async #productsFor(restaurantId, currency, extraFilter = {}) {
    const products = await this.products
      .find({ restaurantId, status: PRODUCT_STATUS.ACTIVE, deletedAt: { $in: [null, undefined] }, ...extraFilter })
      .sort({ displayOrder: 1, name: 1 })
      .limit(500)
      .lean();
    if (!products.length) return [];

    const productIds = products.map((p) => p._id);
    const live = { deletedAt: { $in: [null, undefined] } };
    // Batched: four queries for the whole menu, never N-per-product.
    const [variants, groups, modifiers, addons] = await Promise.all([
      this.variants.find({ productId: { $in: productIds }, ...live }).sort({ displayOrder: 1 }).lean(),
      this.modifierGroups.find({ restaurantId, status: ENTITY_STATUS.ACTIVE, ...live }).sort({ displayOrder: 1 }).lean(),
      this.modifiers.find({ restaurantId, ...live }).sort({ displayOrder: 1 }).lean(),
      this.addons.find({ restaurantId, ...live }).sort({ displayOrder: 1 }).lean(),
    ]);

    const groupBy = (rows, key) => {
      const map = new Map();
      for (const row of rows) {
        const k = String(row[key]);
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(row);
      }
      return map;
    };

    const variantsByProduct = groupBy(variants, 'productId');
    const modifiersByGroup = groupBy(modifiers, 'groupId');
    // Attach each group's options once, then reuse across products.
    const groupById = new Map(
      groups.map((g) => [String(g._id), { ...g, modifiers: modifiersByGroup.get(String(g._id)) ?? [] }]),
    );
    const addonById = new Map(addons.map((a) => [String(a._id), a]));

    return products.map((p) =>
      toProduct(p, {
        currency,
        variants: variantsByProduct.get(String(p._id)) ?? [],
        groups: (p.modifierGroupIds ?? []).map((gid) => groupById.get(String(gid))).filter(Boolean),
        addons: (p.addonIds ?? []).map((aid) => addonById.get(String(aid))).filter(Boolean),
      }),
    );
  }

  /** GET /public/branches/:slug/menu — the full browsable menu. */
  async branchMenu(slug) {
    const branch = await this.#branch(slug);
    const currency = this.#currencyOf(branch);
    const restaurantId = branch.restaurantId;

    const [categoryDocs, products] = await Promise.all([
      this.categories
        .find({ restaurantId, status: CATEGORY_STATUS.ACTIVE, deletedAt: { $in: [null, undefined] } })
        .sort({ depth: 1, displayOrder: 1, name: 1 })
        .lean(),
      this.#productsFor(restaurantId, currency),
    ]);

    // Nest subcategories under their parent (the model caps depth at 1).
    const categories = categoryDocs.map(toMenuCategory);
    const byId = new Map(categories.map((c) => [c.id, { ...c, children: [] }]));
    const tree = [];
    for (const category of byId.values()) {
      const parent = category.parentId ? byId.get(category.parentId) : null;
      if (parent) parent.children.push(category);
      else tree.push(category);
    }

    return {
      branchSlug: branch.slug,
      branchName: branch.name,
      currency,
      categories: tree,
      products,
      popular: products.filter((p) => p.popular).slice(0, 10),
      recommended: products.filter((p) => p.recommended).slice(0, 10),
    };
  }

  /** GET /public/branches/:slug/menu/search — in-menu product search. */
  async search(slug, term) {
    const q = String(term ?? '').trim();
    if (q.length < 2) return [];
    const branch = await this.#branch(slug);
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.#productsFor(branch.restaurantId, this.#currencyOf(branch), {
      $or: [{ name: new RegExp(escaped, 'i') }, { tags: new RegExp(`^${escaped}$`, 'i') }],
    });
  }

  /** GET /public/branches/:slug/products/:productSlug — full product detail. */
  async product(slug, productSlug) {
    const branch = await this.#branch(slug);
    const currency = this.#currencyOf(branch);
    const all = await this.#productsFor(branch.restaurantId, currency);
    const product = all.find((p) => p.slug === String(productSlug).toLowerCase());
    if (!product) throw new NotFoundError('Product not found');
    return {
      ...product,
      related: all.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 8),
    };
  }

  /**
   * GET /public/branches/:slug/menu/recent — recently-ordered products.
   * Order history lives in the order module; until that link is wired this
   * returns an empty list rather than a 404, so the rail simply doesn't render.
   */
  async recentlyOrdered(slug) {
    await this.#branch(slug);
    return [];
  }
}

export const publicMenuService = new PublicMenuService();
export default publicMenuService;
