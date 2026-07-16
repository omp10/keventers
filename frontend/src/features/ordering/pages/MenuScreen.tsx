import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Input,
  Spinner,
  toast,
} from '@/design-system';
import { useBranchDetail } from '@/features/discovery';
import { ProductDetailDrawer } from '../components';
import { MenuBoard, MenuHero, MenuSearch, ProductRail } from '../menu';
import { FloatingCart } from '../cart';
import { useCart, useMenu, useProduct, usePrefetchProduct } from '../hooks';
import { sessionService } from '../services';
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
  const cart = useCart();
  const prefetch = usePrefetchProduct(branchSlug);

  const [openSlug, setOpenSlug] = useState<string | undefined>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState('');
  const [pendingSelection, setPendingSelection] = useState<CartItemSelection | null>(null);
  const [openingSession, setOpeningSession] = useState(false);
  const productQ = useProduct(branchSlug, openSlug);

  const cartQuantities = useMemo(() => {
    const m: Record<string, number> = {};
    cart.items.forEach((i) => (m[i.productId] = (m[i.productId] ?? 0) + i.quantity));
    return m;
  }, [cart.items]);

  const needsConfig = (p: Product) => p.customizable || (p.variants?.length ?? 0) > 0 || (p.modifierGroups?.length ?? 0) > 0;

  const addSelection = async (selection: CartItemSelection) => {
    if (!cart.hasSession) {
      setPendingSelection(selection);
      return false;
    }
    await cart.add(selection);
    return true;
  };

  const onAdd = async (p: Product) => {
    if (needsConfig(p)) {
      setOpenSlug(p.slug);
      return;
    }
    try {
      if (await addSelection({ productId: p.id, quantity: 1 })) toast.success(`${p.name} added`);
    } catch (e) {
      toast.error('Could not add item', { description: (e as Error).message });
    }
  };

  const onOpen = (p: Product) => setOpenSlug(p.slug);

  const addFromDetail = async (selection: CartItemSelection) => {
    if (await addSelection(selection)) toast.success('Added to cart');
  };

  const openTableSession = async () => {
    const normalized = tableNumber.trim();
    if (!branchSlug || !pendingSelection || !normalized) return;
    setOpeningSession(true);
    try {
      await sessionService.open(branchSlug, { tableNumber: normalized });
      await cart.add(pendingSelection);
      setPendingSelection(null);
      setTableNumber('');
      toast.success('Table confirmed', { description: 'Your item was added to the cart.' });
    } catch (error) {
      toast.error('Could not start ordering', { description: (error as Error).message });
    } finally {
      setOpeningSession(false);
    }
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

      <Dialog open={Boolean(pendingSelection)} onOpenChange={(open) => !open && !openingSession && setPendingSelection(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Which table are you at?</DialogTitle>
            <DialogDescription>Enter the table number shown at your seat so the kitchen can route your order correctly.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <form
              id="table-session-form"
              onSubmit={(event) => {
                event.preventDefault();
                void openTableSession();
              }}
            >
              <label className="space-y-2 text-sm font-medium text-foreground">
                Table number
                <Input
                  autoFocus
                  value={tableNumber}
                  onChange={(event) => setTableNumber(event.target.value)}
                  placeholder="For example, 12"
                  autoComplete="off"
                  maxLength={20}
                />
              </label>
            </form>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" disabled={openingSession} onClick={() => setPendingSelection(null)}>Cancel</Button>
            <Button type="submit" form="table-session-form" loading={openingSession} disabled={!tableNumber.trim()}>Start ordering</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
