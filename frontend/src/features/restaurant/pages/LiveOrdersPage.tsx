import { Suspense, lazy, useState } from 'react';

import { Button, Spinner, EmptyState, Icon } from '@/design-system';
import { qk, queryClient } from '@/platform/query';
import { useLiveOrders, useOrderDrawer } from '../hooks';
import { BoardViewToggle, OrderBoard, OrderFilters, SessionBillDialog, type BoardView } from '../orders';
import type { OrderFilters as Filters } from '../services';
import type { OrderSummary } from '../types';

/**
 * Assignment lives in the KITCHEN module, and the kitchen already imports from
 * this one — a static import here would close that loop. Lazy keeps the
 * dependency at runtime and off this page's critical chunk.
 */
const ChefAssignSheet = lazy(() =>
  import('@/features/kitchen/panels').then((m) => ({ default: m.ChefAssignSheet })),
);

/**
 * LiveOrdersPage — the primary operational screen. Realtime (Socket-driven, no
 * polling) order board with filters, search, saved views, and 4 rendering views.
 * Opening an order deep-links the global detail drawer.
 */
export function LiveOrdersPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [view, setView] = useState<BoardView>('list');
  const orders = useLiveOrders(filters);
  const drawer = useOrderDrawer();
  // Which order's SESSION bill is open (the bill covers the whole sitting).
  const [billFor, setBillFor] = useState<string | undefined>();
  // The order being assigned to a chef/station. The orders page used to have no
  // way to assign at all — that action existed only on the kitchen board, so a
  // manager working the list had to switch screens to give a ticket to someone.
  const [assignFor, setAssignFor] = useState<OrderSummary | null>(null);

  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 text-xl font-bold text-foreground">
          {/* Pulsing live dot — the page is socket-fed, say so. */}
          <span className="relative grid h-3 w-3 place-items-center" aria-hidden>
            <span className="absolute h-3 w-3 animate-ping rounded-full bg-success/60 motion-reduce:animate-none" />
            <span className="relative h-2 w-2 rounded-full bg-success" />
          </span>
          Live orders
          {orders.items.length > 0 && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
              {orders.items.length}
            </span>
          )}
        </h1>
        <BoardViewToggle view={view} setView={setView} />
      </div>

      <OrderFilters filters={filters} patch={patch} reset={() => setFilters({})} />

      {orders.isLoading ? (
        <div className="grid h-40 place-items-center"><Spinner /></div>
      ) : orders.items.length === 0 ? (
        <EmptyState icon={<Icon name="order" className="mb-3 h-8 w-8 text-muted-foreground" />} title="No orders" description="New orders will appear here in realtime." size="sm" />
      ) : (
        <>
          <OrderBoard orders={orders.items} view={view} onOpen={drawer.open} onBill={setBillFor} onAssign={setAssignFor} />
          {orders.hasNext && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" loading={orders.isFetching} onClick={orders.next}>Load more</Button>
            </div>
          )}
        </>
      )}

      <SessionBillDialog orderId={billFor} open={Boolean(billFor)} onClose={() => setBillFor(undefined)} />

      {assignFor && (
        <Suspense fallback={null}>
          <ChefAssignSheet
            entry={{ orderId: assignFor.id, orderNumber: assignFor.orderNumber }}
            onClose={() => {
              setAssignFor(null);
              // Assigning changes the KITCHEN ticket, not the order row, but the
              // two are kept in sync — pull the list so the board this manager
              // is looking at reflects it rather than going quietly stale.
              void queryClient.invalidateQueries({ queryKey: qk('staff', 'orders') });
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
