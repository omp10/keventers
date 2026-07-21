import { useEffect, useMemo, useState } from 'react';
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
import { JOURNEY, useJourney } from '@/platform/analytics';
import { ProductDetailDrawer } from '../components';
import { MenuBoard, MenuHero, MenuSearch, ProductRail } from '../menu';
import { FloatingCart } from '../cart';
import { useActiveLiveOrder } from '../components/LiveOrderTracker';
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
  const { branchSlug, categorySlug, subSlug } = useParams<{ branchSlug: string; categorySlug?: string; subSlug?: string }>();
  const navigate = useNavigate();
  const branch = useBranchDetail(branchSlug);
  const menu = useMenu(branchSlug);
  const cart = useCart();
  // While an order is LIVE, the floating dock above the tabs carries the cart
  // as a swipeable slide — rendering this bar too stacked two pop-ups on a
  // phone. No live order → this bar is the sole (and best) cart CTA.
  const activeOrder = useActiveLiveOrder(true);
  const dockOwnsCart = Boolean(activeOrder.data);
  const prefetch = usePrefetchProduct(branchSlug);
  const journey = useJourney();

  // One journey step per menu visit / category hop — the funnel's browse leg.
  useEffect(() => {
    if (menu.data) journey(JOURNEY.MENU_LOADED, { outletSlug: branchSlug });
  }, [Boolean(menu.data), branchSlug]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (categorySlug) journey(JOURNEY.CATEGORY_VIEWED, { outletSlug: branchSlug, categorySlug, ...(subSlug ? { subSlug } : {}) });
  }, [categorySlug, subSlug]); // eslint-disable-line react-hooks/exhaustive-deps

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
    journey(JOURNEY.ADDED_TO_CART, { outletSlug: branchSlug, productId: selection.productId, quantity: selection.quantity });
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

  // Stepper "−". The cart merges identical configs into one line, so a simple
  // product is a single line: drop qty by one, or remove it at one. A
  // customizable product can span several lines; there is no one "the" line to
  // decrement, so we take the most recently added — the reverse of the last
  // "Add". "+" stays onAdd (opens the drawer for customizable, quick-adds
  // otherwise).
  const onDecrement = async (p: Product) => {
    const lines = cart.items.filter((i) => i.productId === p.id);
    const line = lines[lines.length - 1];
    if (!line) return;
    try {
      if (line.quantity > 1) await cart.setQuantity(line.id, line.quantity - 1);
      else await cart.removeItem(line.id);
    } catch (e) {
      toast.error('Could not update cart', { description: (e as Error).message });
    }
  };

  const onOpen = (p: Product) => {
    journey(JOURNEY.PRODUCT_OPENED, { outletSlug: branchSlug, productId: p.id, productSlug: p.slug });
    setOpenSlug(p.slug);
  };

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
        // Back POPS, it does not push /r/:slug. Pushing it was the loop: the
        // branch page's own Back is navigate(-1), which landed straight back on
        // the menu, which pushed the branch page again, forever. `idx` is the
        // router's own history position — 0 means we opened here cold (a scanned
        // QR), so there is nothing to pop back to and we go to the branch page.
        onBack={() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate(`/r/${branchSlug}`, { replace: true }))}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <ProductRail title="Popular" icon="trend" products={data.popular ?? []} onAdd={onAdd} onDecrement={onDecrement} onOpen={onOpen} onPrefetch={prefetch} cartQuantities={cartQuantities} />
      <ProductRail title="Recommended" icon="star" products={data.recommended ?? []} onAdd={onAdd} onDecrement={onDecrement} onOpen={onOpen} onPrefetch={prefetch} cartQuantities={cartQuantities} />

      <MenuBoard
        menu={data}
        selection={{ categorySlug, subSlug }}
        // Browsing rewrites the URL so the view is shareable/refreshable, but
        // `replace` keeps Back meaning "leave the menu" rather than replaying
        // every chip tap.
        onSelect={({ categorySlug: c, subSlug: s }) => {
          const path = [`/r/${branchSlug}/menu`, c, c && s].filter(Boolean).join('/');
          navigate(path, { replace: true });
        }}
        onAdd={onAdd}
        onDecrement={onDecrement}
        onOpen={onOpen}
        onPrefetch={prefetch}
        cartQuantities={cartQuantities}
      />

      {!dockOwnsCart && (
      <FloatingCart
        itemCount={cart.itemCount}
        total={cart.pricing?.total}
        onClick={() => navigate('/cart')}
        className="bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-0"
      />
      )}

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
