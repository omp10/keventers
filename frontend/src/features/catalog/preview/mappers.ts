/**
 * PREVIEW MAPPERS (Phase F4.2) — pure adapters that translate the CATALOG draft
 * domain (what the admin edits) into the ORDERING domain (what customers see), so
 * the Live Preview can render the exact customer components against the current
 * catalog data. No business rules live here — just field mapping.
 */
import type { BranchMenu, MenuCategory, Product } from '@/features/ordering';
import type { CatalogProduct, Category } from '../types';

/** Map a catalog draft product → the ordering Product the customer UI expects. */
export function catalogProductToOrdering(p: CatalogProduct): Product {
  return {
    id: p.id,
    slug: p.slug ?? p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.images[0]?.url,
    images: p.images.map((i) => i.url),
    categoryId: p.categoryId ?? '',
    price: p.price,
    discountedPrice: p.discountedPrice,
    prepTimeMinutes: p.prepTimeMinutes,
    veg: p.veg,
    popular: p.popular,
    available: p.availability.state === 'available',
    customizable: Boolean(p.variants?.length || p.modifierGroups?.length),
    variants: (p.variants ?? []).map((v, i) => ({
      id: v.id,
      name: v.name,
      price: v.price,
      available: v.available,
      isDefault: i === 0,
    })),
    modifierGroups: p.modifierGroups ?? [],
    addons: p.addons ?? [],
    tags: p.tags,
  };
}

/** Map a catalog category → the ordering MenuCategory used for nav + sections. */
export function catalogCategoryToOrdering(c: Category): MenuCategory {
  return {
    id: c.id,
    slug: c.slug ?? c.id,
    name: c.name,
    description: c.description,
    imageUrl: c.image?.url,
    parentId: c.parentId,
    order: c.order,
  };
}

/** Flatten a (possibly nested) category tree into a flat list, preserving order. */
function flattenCategories(categories: Category[]): Category[] {
  const out: Category[] = [];
  const walk = (list: Category[]) => {
    for (const c of list) {
      out.push(c);
      if (c.children?.length) walk(c.children);
    }
  };
  walk(categories);
  return out;
}

/**
 * Assemble a full ordering BranchMenu from the current catalog data. Used by the
 * Live Preview so admin edits (React Query cache) flow straight into the customer
 * MenuBoard. Everything is kept — the preview shows the catalog as-is.
 */
export function buildBranchMenu(categories: Category[], products: CatalogProduct[]): BranchMenu {
  const flatCategories = flattenCategories(categories).map(catalogCategoryToOrdering);
  const orderingProducts = products.map(catalogProductToOrdering);
  const currency = products[0]?.price.currency ?? 'INR';

  return {
    branchSlug: 'preview',
    branchName: 'Live preview',
    currency,
    categories: flatCategories,
    products: orderingProducts,
    popular: products.filter((p) => p.popular).map(catalogProductToOrdering),
  };
}
