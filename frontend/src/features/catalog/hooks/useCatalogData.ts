import { useInfiniteResource, useQueryResource } from '@/platform/query';
import {
  addonService,
  categoryService,
  menuService,
  modifierGroupService,
  productService,
  variantService,
} from '../services';
import type { AddonDraft, CatalogProduct, Category, Menu, ModifierGroupDraft, ProductFilters, VariantDraft } from '../types';
import { CK } from './keys';

export function useMenus() {
  return useQueryResource<Menu[]>(CK.menus(), () => menuService.list(), { staleTime: 30_000 });
}

export function useCategoryTree() {
  return useQueryResource<Category[]>(CK.categoryTree(), () => categoryService.tree(), { staleTime: 30_000 });
}

/** Flat category list (for pickers). */
export function useCategories() {
  return useQueryResource<Category[]>(CK.categories(), () => categoryService.list(), { staleTime: 30_000 });
}

/** Products — infinite scroll + filters (virtualized-list friendly). */
export function useProducts(filters: ProductFilters) {
  return useInfiniteResource<CatalogProduct>(CK.products(filters), (page) => productService.list(filters, page), { staleTime: 15_000 });
}

export function useProduct(id: string | undefined) {
  return useQueryResource<CatalogProduct>(CK.product(id), () => productService.get(id!), { enabled: Boolean(id) });
}

export function useModifierGroups() {
  return useQueryResource<ModifierGroupDraft[]>(CK.modifierGroups(), () => modifierGroupService.list(), { staleTime: 30_000 });
}

export function useAddons() {
  return useQueryResource<AddonDraft[]>(CK.addons(), () => addonService.list(), { staleTime: 30_000 });
}

export function useProductVariants(productId: string | undefined) {
  return useQueryResource<VariantDraft[]>(CK.variantsForProduct(productId), () => variantService.listForProduct(productId!), { enabled: Boolean(productId) });
}

export function useAllVariants(q?: string) {
  return useQueryResource<(VariantDraft & { productId: string; productName: string })[]>(CK.allVariants(q), () => variantService.listAll(q), { staleTime: 30_000 });
}
