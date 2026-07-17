import type { Category } from '../types';

/**
 * What the product editor's Category → Subcategory pair should show for a
 * product filed under `categoryId`.
 */
export type CategorySelection = {
  /** Main categories, the only valid options for the first select. */
  mains: Category[];
  /** The category the product is actually filed under (main OR sub). */
  current?: Category;
  /** The main to show selected — the parent when a sub is chosen. */
  mainId?: string;
  /** Subcategories of `mainId`; empty means the second select is not offered. */
  subs: Category[];
  /** The chosen main is subdivided but no subcategory has been picked. */
  subMissing: boolean;
};

/**
 * Resolve the two-select view over a product's single `categoryId`.
 *
 * A product stores exactly ONE category — the deepest one it was filed under.
 * The editor shows two selects, so which main to display is DERIVED from the
 * stored category's parent rather than tracked alongside it; there is no second
 * field that can drift out of sync with what the server holds.
 *
 * `subMissing` is the rule the editor enforces on publish: once a main has
 * subcategories, a product filed on the main itself is one customers browsing by
 * subcategory would never reach.
 */
export function resolveCategorySelection(categories: Category[], categoryId?: string): CategorySelection {
  const mains = categories.filter((c) => !c.parentId);
  const current = categories.find((c) => c.id === categoryId);
  const mainId = current?.parentId ?? current?.id;
  const subs = mainId ? categories.filter((c) => c.parentId === mainId) : [];
  return { mains, current, mainId, subs, subMissing: subs.length > 0 && !current?.parentId };
}
