import { lazyRoute } from '@/platform/error';
import { type ReactNode } from 'react';

/**
 * CATALOG ROUTES — the single config for the Catalog Management app, nested under
 * the RestaurantLayout (F4.1 shell) at /dashboard. Pages are lazy-loaded.
 */
export type CatalogRoute = { path: string; element: ReactNode };

const MenusPage = lazyRoute(() => import('./menus').then((m) => ({ default: m.MenusPage })));
const CategoriesPage = lazyRoute(() => import('./categories').then((m) => ({ default: m.CategoriesPage })));
const ProductsPage = lazyRoute(() => import('./products').then((m) => ({ default: m.ProductsPage })));
const VariantsPage = lazyRoute(() => import('./variants').then((m) => ({ default: m.VariantsPage })));
const ModifiersPage = lazyRoute(() => import('./modifiers').then((m) => ({ default: m.ModifiersPage })));
const AddonsPage = lazyRoute(() => import('./addons').then((m) => ({ default: m.AddonsPage })));
const PreviewPage = lazyRoute(() => import('./preview').then((m) => ({ default: m.PreviewPage })));

export const catalogRoutes: CatalogRoute[] = [
  { path: '/dashboard/menu', element: <MenusPage /> },
  { path: '/dashboard/catalog/categories', element: <CategoriesPage /> },
  { path: '/dashboard/catalog/products', element: <ProductsPage /> },
  { path: '/dashboard/catalog/variants', element: <VariantsPage /> },
  { path: '/dashboard/catalog/modifiers', element: <ModifiersPage /> },
  { path: '/dashboard/catalog/addons', element: <AddonsPage /> },
  { path: '/dashboard/catalog/preview', element: <PreviewPage /> },
];
