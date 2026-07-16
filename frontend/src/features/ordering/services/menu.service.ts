import { api } from '@/platform/api';
import type { BranchMenu, Product, ProductDetail } from '../types';

/**
 * MENU SERVICE — the branch menu + product detail. Menus are BRANCH-scoped (a
 * branch can override availability), matching the backend architecture. All reads
 * are public (`skipAuth`) so a guest can browse before opening a session.
 */
class MenuService {
  /** The full menu (categories + products + curated rails) for a branch. */
  branchMenu(branchSlug: string) {
    return api.get<BranchMenu>(`/public/branches/${encodeURIComponent(branchSlug)}/menu`, { skipAuth: true });
  }

  /** A single product's full detail (variants/modifiers/addons/related). */
  product(branchSlug: string, productSlug: string) {
    return api.get<ProductDetail>(
      `/public/branches/${encodeURIComponent(branchSlug)}/products/${encodeURIComponent(productSlug)}`,
      { skipAuth: true },
    );
  }

  /** In-menu search within a branch. */
  search(branchSlug: string, q: string) {
    return api.get<Product[]>(`/public/branches/${encodeURIComponent(branchSlug)}/menu/search`, { query: { q }, skipAuth: true });
  }

  /** Recently-ordered products for the current guest/customer at a branch. */
  recentlyOrdered(branchSlug: string) {
    return api.get<Product[]>(`/public/branches/${encodeURIComponent(branchSlug)}/menu/recent`, {});
  }
}

export const menuService = new MenuService();
