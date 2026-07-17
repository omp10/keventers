import type { BranchMenu, MenuCategory, Product } from '../types';

/**
 * A main category resolved for rendering: its own direct products, plus the
 * subcategories that actually have something to show.
 */
export type MenuNode = {
  category: MenuCategory;
  /** Subcategories WITH products (empty ones are never rendered). */
  subs: { category: MenuCategory; products: Product[] }[];
  /** Products hung directly on the main category (a flat menu, or a mixed one). */
  directProducts: Product[];
  /** Everything under this main, de-duplicated, in display order. */
  allProducts: Product[];
  /**
   * Whether to offer subcategory navigation. False when there are 0 subs, and
   * ALSO false for exactly 1 — a single chip is a decision with no alternative,
   * so we skip it and show the products (the brief's "smart behaviour").
   */
  showSubNav: boolean;
};

const byOrder = <T extends { order?: number; name?: string }>(a: T, b: T) =>
  (a.order ?? 0) - (b.order ?? 0) || String(a.name ?? '').localeCompare(String(b.name ?? ''));

/**
 * Build the render model from a BranchMenu.
 *
 * The backend's Category model is self-referencing and capped at depth 1, and
 * `/public/branches/:slug/menu` already returns mains with `children` nested —
 * so this is pure shaping, never a second source of truth. It exists because the
 * SAME menu must render two ways: cafés hang products straight off a category,
 * while bigger menus hang them off subcategories. Deciding that per-category
 * here keeps every component downstream ignorant of the difference.
 *
 * Empty categories are dropped: a heading with nothing under it reads as broken.
 */
export function buildMenuTree(menu: BranchMenu): MenuNode[] {
  const productsByCategory = new Map<string, Product[]>();
  for (const p of menu.products) {
    const arr = productsByCategory.get(p.categoryId);
    if (arr) arr.push(p);
    else productsByCategory.set(p.categoryId, [p]);
  }
  const productsOf = (id: string) => productsByCategory.get(id) ?? [];

  return [...menu.categories]
    .sort(byOrder)
    .map((category): MenuNode => {
      const subs = [...(category.children ?? [])]
        .sort(byOrder)
        .map((sub) => ({ category: sub, products: productsOf(sub.id) }))
        .filter((s) => s.products.length > 0);

      const directProducts = productsOf(category.id);
      // A product lives on exactly one category, so concatenating direct +
      // per-sub products cannot duplicate.
      const allProducts = [...directProducts, ...subs.flatMap((s) => s.products)];

      return { category, subs, directProducts, allProducts, showSubNav: subs.length > 1 };
    })
    .filter((node) => node.allProducts.length > 0);
}

/** Find a node by category slug (deep links address categories by slug). */
export function findNode(tree: MenuNode[], slug?: string): MenuNode | undefined {
  return slug ? tree.find((n) => n.category.slug === slug) : undefined;
}

/** Find a subcategory within a node by slug. */
export function findSub(node: MenuNode | undefined, slug?: string) {
  return slug ? node?.subs.find((s) => s.category.slug === slug) : undefined;
}
