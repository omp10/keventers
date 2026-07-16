import { qk } from '@/platform/query';
import type { ProductFilters } from '../types';

/** Centralized catalog query keys (precise cache updates + invalidation). */
export const CK = {
  menus: () => qk('catalog', 'menus'),
  categoryTree: () => qk('catalog', 'category-tree'),
  categories: () => qk('catalog', 'categories'),
  category: (id?: string) => qk('catalog', 'category', id ?? null),
  products: (filters?: ProductFilters) => qk('catalog', 'products', filters ?? {}),
  product: (id?: string) => qk('catalog', 'product', id ?? null),
  modifierGroups: () => qk('catalog', 'modifier-groups'),
  addons: () => qk('catalog', 'addons'),
  variantsForProduct: (productId?: string) => qk('catalog', 'variants', productId ?? null),
  allVariants: (q?: string) => qk('catalog', 'all-variants', q ?? ''),
  scope: () => qk('catalog'),
};
