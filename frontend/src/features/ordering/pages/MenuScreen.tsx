import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Spinner, ErrorState, toast } from '@/design-system';
import { useBranchDetail } from '@/features/discovery';
import { ProductDetailDrawer } from '../components';
import { MenuBoard, MenuHero, MenuSearch, ProductRail } from '../menu';
import { FloatingCart } from '../cart';
import { useCart, useMenu, useProduct, usePrefetchProduct } from '../hooks';
import type { CartItemSelection, Product } from '../types';

/**
 * MenuScreen (/r/:branchSlug/menu) — the ordering entry after selecting a branch.
 * Composes the branch hero, curated rails, the sticky category board, the product
 * detail drawer, in-menu search, and the floating cart. Non-customizable products
 * quick-add; customizable ones open the drawer. Prices/cart come from the backend.
 */
export function MenuScreen() {
  const { branchSlug } = useParams<{ branchSlug: string }>();
  const navigate = useNavigate();
  const branch = useBranchDetail(branchSlug);
  const menu = useMenu(branchSlug);
  const cart = useCart(branchSlug);
  const prefetch = usePrefetchProduct(branchSlug);

  const [openSlug, setOpenSlug] = useState<string | undefined>();
  const [searchOpen, setSearchOpen] = useState(false);
  const productQ = useProduct(branchSlug, openSlug);

  const cartQuantities = useMemo(() => {
    const m: Record<string, number> = {};
    cart.items.forEach((i) => (m[i.productId] = (m[i.productId] ?? 0) + i.quantity));
    return m;
  }, [cart.items]);

  const needsConfig = (p: Product) => p.customizable || (p.variants?.length ?? 0) > 0 || (p.modifierGroups?.length ?? 0) > 0;

  const onAdd = async (p: Product) => {
    if (needsConfig(p)) {
      setOpenSlug(p.slug);
      return;
    }
    try {
      await cart.add({ productId: p.id, quantity: 1 });
      toast.success(`${p.name} added`);
    } catch (e) {
      toast.error('Could not add item', { description: (e as Error).message });
    }
  };

  const onOpen = (p: Product) => setOpenSlug(p.slug);

  const addFromDetail = async (selection: CartItemSelection) => {
    await cart.add(selection);
    toast.success('Added to cart');
  };

  if (menu.isLoading) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <Spinner />
      </div>
    );
  }
  if (menu.isError || !menu.data) {
    return (
      <div className="grid h-[60vh] place-items-center p-6">
        <ErrorState title="Menu unavailable" description="We couldn't load this menu. Please try again." onRetry={() => menu.refetch()} />
      </div>
    );
  }

  const data = menu.data;

  return (
    <div className="pb-24">
      <MenuHero
        branchName={branch.data?.name ?? data.branchName ?? 'Menu'}
        restaurantName={branch.data?.restaurant.name}
        coverImageUrl={branch.data?.coverImageUrl}
        openNow={branch.data?.hours.openNow}
        onBack={() => navigate(`/r/${branchSlug}`)}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <ProductRail title="Popular" icon="trend" products={data.popular ?? []} onAdd={onAdd} onOpen={onOpen} onPrefetch={prefetch} />
      <ProductRail title="Recommended" icon="star" products={data.recommended ?? []} onAdd={onAdd} onOpen={onOpen} onPrefetch={prefetch} />

      <MenuBoard menu={data} onAdd={onAdd} onOpen={onOpen} onPrefetch={prefetch} cartQuantities={cartQuantities} />

      <FloatingCart itemCount={cart.itemCount} total={cart.pricing?.total} onClick={() => navigate('/cart')} />

      <ProductDetailDrawer
        product={productQ.data}
        loading={productQ.isLoading}
        open={Boolean(openSlug)}
        onOpenChange={(o) => !o && setOpenSlug(undefined)}
        onAddToCart={addFromDetail}
        onSelectRelated={(slug) => setOpenSlug(slug)}
      />

      {searchOpen && branchSlug && (
        <MenuSearch branchSlug={branchSlug} onAdd={onAdd} onOpen={(p) => { setSearchOpen(false); onOpen(p); }} onClose={() => setSearchOpen(false)} />
      )}
    </div>
  );
}
