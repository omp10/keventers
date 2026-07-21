import { lazy, Suspense, useEffect, useState } from 'react';

import { Card, Icon, Spinner } from '@/design-system';
import { qk, queryClient, useQueryResource } from '@/platform/query';
import { setCatalogScope } from '@/features/catalog/catalog-scope';
import { adminService } from './admin.service';

const ProductsPage = lazy(() => import('@/features/catalog/products').then((m) => ({ default: m.ProductsPage })));
const CategoriesPage = lazy(() => import('@/features/catalog/categories').then((m) => ({ default: m.CategoriesPage })));

/**
 * ADMIN CATALOG — the platform-admin "Products" surface the SOW's central CMS
 * needs: a super-admin picks a KITCHEN (outlet) and manages its full catalog —
 * every product, filterable, plus its categories — reusing the exact dashboard
 * catalog pages. The kitchen choice is pushed into the catalog scope so those
 * pages' services carry `?restaurantId=`; the dashboard (unscoped) is untouched.
 */
export function AdminCatalogPage({ tab, brandId }: { tab: 'products' | 'categories'; brandId?: string }) {
  // When a brand is supplied (the brand detail page) the scope is FIXED and the
  // picker is hidden — you are already inside that brand, so asking again would
  // let you edit one brand's menu from another brand's screen.
  const [picked, setPicked] = useState<string>('');
  const restaurantId = brandId ?? picked;
  const setRestaurantId = setPicked;
  const embedded = Boolean(brandId);

  const restaurants = useQueryResource(qk('admin', 'catalog-restaurants'), () => adminService.kitchenRestaurants());
  const options = restaurants.data ?? [];

  // Publish the picked kitchen to the catalog services, and clear it on unmount
  // so leaving this page can never leak scope into the dashboard.
  useEffect(() => {
    setCatalogScope(restaurantId || null);
    // Any cached catalog query was fetched under a different scope — drop it.
    void queryClient.invalidateQueries({ queryKey: ['catalog'] });
    return () => setCatalogScope(null);
  }, [restaurantId]);

  return (
    <div className="space-y-4">
      {!embedded && (
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{tab === 'products' ? 'Products' : 'Categories'}</h1>
          <p className="text-sm text-foreground-muted">
            {tab === 'products'
              ? 'Every product for the selected kitchen — search, filter, edit and add.'
              : 'Menu categories for the selected kitchen — create and organise.'}
          </p>
        </div>
        <label className="text-xs font-medium text-foreground-muted">
          Brand
          <select
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            className="mt-1 block h-10 min-w-56 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">Choose a brand…</option>
            {options.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
      </div>
      )}

      {embedded ? null : restaurants.isLoading ? (
        <div className="grid min-h-40 place-items-center"><Spinner /></div>
      ) : !restaurantId ? (
        <Card padding="lg" className="text-center">
          <Icon name="store" className="mx-auto h-8 w-8 text-foreground-subtle" />
          <p className="mt-2 text-sm text-foreground-muted">Pick a brand above to manage its {tab}.</p>
        </Card>
      ) : null}

      {restaurantId && (
        // key remounts the page when the kitchen changes so no state leaks across outlets.
        <Suspense key={restaurantId} fallback={<div className="grid min-h-40 place-items-center"><Spinner /></div>}>
          {tab === 'products' ? <ProductsPage /> : <CategoriesPage />}
        </Suspense>
      )}
    </div>
  );
}
