import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useRegisterCommands } from '@/platform/command';
import { useSearchProvider, type SearchResult } from '@/platform/search';
import { productService } from '../services';

const MANAGE = { anyPermission: ['product:manage', 'menu:manage', 'catalog:manage'] };
const READ = { anyPermission: ['product:read', 'menu:read', 'catalog:read'] };

/**
 * useCatalogIntegrations — registers catalog commands (⌘K) + a Global Search
 * provider for products. Permission-aware via the platform registries. Mounted by
 * the catalog layout so it's active across catalog pages.
 */
export function useCatalogIntegrations() {
  const navigate = useNavigate();

  useRegisterCommands(
    [
      { id: 'cat-new-product', title: 'New product', icon: 'add', section: 'Catalog', access: MANAGE, run: () => navigate('/dashboard/catalog/products?new=1') },
      { id: 'cat-new-category', title: 'New category', icon: 'add', section: 'Catalog', access: MANAGE, run: () => navigate('/dashboard/catalog/categories?new=1') },
      { id: 'cat-search-products', title: 'Search products', icon: 'search', section: 'Catalog', access: READ, run: () => navigate('/dashboard/catalog/products') },
      { id: 'cat-search-categories', title: 'Search categories', icon: 'search', section: 'Catalog', access: READ, run: () => navigate('/dashboard/catalog/categories') },
      { id: 'cat-publish-menu', title: 'Publish menu', icon: 'checkCircle', section: 'Catalog', access: MANAGE, run: () => navigate('/dashboard/menu') },
    ],
    [navigate],
  );

  const provider = useMemo(
    () => ({
      id: 'catalog-products',
      label: 'Products',
      icon: 'utensils' as const,
      access: READ,
      search: async (q: string): Promise<SearchResult[]> => {
        const page = await productService.list({ q }, 1, 6);
        return page.items.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: p.categoryName ? `${p.categoryName} · ${p.status}` : p.status,
          icon: 'utensils' as const,
          group: 'Products',
          href: `/dashboard/catalog/products?product=${p.id}`,
        }));
      },
    }),
    [],
  );

  useSearchProvider(provider);
}
