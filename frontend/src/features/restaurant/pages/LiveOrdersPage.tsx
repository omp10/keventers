import { useState } from 'react';

import { Button, Spinner, EmptyState, Icon } from '@/design-system';
import { useLiveOrders, useOrderDrawer } from '../hooks';
import { BoardViewToggle, OrderBoard, OrderFilters, type BoardView } from '../orders';
import type { OrderFilters as Filters } from '../services';

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

  const patch = (p: Partial<Filters>) => setFilters((f) => ({ ...f, ...p }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Live orders</h1>
        <BoardViewToggle view={view} setView={setView} />
      </div>

      <OrderFilters filters={filters} patch={patch} reset={() => setFilters({})} />

      {orders.isLoading ? (
        <div className="grid h-40 place-items-center"><Spinner /></div>
      ) : orders.items.length === 0 ? (
        <EmptyState icon={<Icon name="order" className="mb-3 h-8 w-8 text-muted-foreground" />} title="No orders" description="New orders will appear here in realtime." size="sm" />
      ) : (
        <>
          <OrderBoard orders={orders.items} view={view} onOpen={drawer.open} />
          {orders.hasNext && (
            <div className="flex justify-center pt-2">
              <Button variant="secondary" loading={orders.isFetching} onClick={orders.next}>Load more</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
