import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Button,
  EmptyState,
  Icon,
  Spinner,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/design-system';
import { cn } from '@/lib/cn';
import { InfiniteSentinel } from '@/features/discovery';

import { useProducts, useCategories, useProductMutations } from '../hooks';
import { CatalogFilters } from '../filters';
import { useBulkSelection, BulkActionBar } from '../bulk';
import type { ProductFilters } from '../types';
import { ProductRow, ProductTableRow } from './ProductRow';
import { ProductEditor } from './ProductEditor';

type View = 'grid' | 'table';

/**
 * ProductsPage — the catalog products workspace: filter, browse (grid/table),
 * multi-select + bulk actions, infinite scroll, and an editor drawer driven by URL
 * search params (?product=<id> / ?new=1).
 */
export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>('grid');
  const [filters, setFilters] = useState<ProductFilters>({});

  const { data: categories } = useCategories();
  const q = useProducts(filters);
  const pm = useProductMutations();
  const sel = useBulkSelection();

  const products = useMemo(() => (q.data?.pages ?? []).flatMap((p) => p.items), [q.data]);

  const patch = (p: Partial<ProductFilters>) => setFilters((f) => ({ ...f, ...p }));
  const reset = () => setFilters({});

  // Editor open state, derived from the URL.
  const editingId = params.get('product') ?? undefined;
  const isNew = params.get('new') === '1';
  const editorOpen = isNew || !!editingId;

  const openNew = () => {
    const next = new URLSearchParams(params);
    next.delete('product');
    next.set('new', '1');
    setParams(next);
  };
  const openEdit = (id: string) => {
    const next = new URLSearchParams(params);
    next.delete('new');
    next.set('product', id);
    setParams(next);
  };
  const closeEditor = () => {
    const next = new URLSearchParams(params);
    next.delete('product');
    next.delete('new');
    setParams(next);
  };

  const runBulk = (action: Parameters<typeof pm.bulk>[0]) => {
    pm.bulk(action, sel.ids);
    sel.clear();
  };

  const bulkActions = [
    { key: 'publish', label: 'Publish', icon: 'checkCircle' as const, onClick: () => runBulk('publish') },
    { key: 'unpublish', label: 'Unpublish', icon: 'eyeOff' as const, onClick: () => runBulk('unpublish') },
    { key: 'available', label: 'Available', icon: 'check' as const, onClick: () => runBulk('available') },
    { key: 'unavailable', label: 'Unavailable', icon: 'close' as const, onClick: () => runBulk('unavailable') },
    {
      key: 'archive',
      label: 'Archive',
      icon: 'delete' as const,
      tone: 'danger' as const,
      onClick: () => runBulk('archive'),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-28">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-xl font-semibold text-foreground">Products</h1>
        <div className="inline-flex items-center rounded-lg border border-border p-0.5">
          <Button
            variant={view === 'grid' ? 'subtle' : 'ghost'}
            size="icon-sm"
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
            onClick={() => setView('grid')}
          >
            <Icon name="grid" />
          </Button>
          <Button
            variant={view === 'table' ? 'subtle' : 'ghost'}
            size="icon-sm"
            aria-label="Table view"
            aria-pressed={view === 'table'}
            onClick={() => setView('table')}
          >
            <Icon name="store" />
          </Button>
        </div>
        <Button variant="primary" leftIcon="add" onClick={openNew}>
          New product
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <CatalogFilters filters={filters} patch={patch} reset={reset} categories={categories} />
      </div>

      {/* Body */}
      {q.isLoading ? (
        <div className="grid place-items-center py-20">
          <Spinner />
        </div>
      ) : q.isError ? (
        <EmptyState
          icon={<Icon name="error" />}
          title="Couldn't load products"
          description="Something went wrong while fetching the catalog."
          action={
            <Button variant="secondary" leftIcon="refresh" onClick={() => q.refetch()}>
              Retry
            </Button>
          }
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Icon name="utensils" />}
          title="No products yet"
          description="Create your first product to start building the menu."
          action={
            <Button variant="primary" leftIcon="add" onClick={openNew}>
              New product
            </Button>
          }
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductRow
              key={p.id}
              product={p}
              selected={sel.isSelected(p.id)}
              onToggleSelect={() => sel.toggle(p.id)}
              onEdit={() => openEdit(p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <ProductTableRow
                  key={p.id}
                  product={p}
                  selected={sel.isSelected(p.id)}
                  onToggleSelect={() => sel.toggle(p.id)}
                  onEdit={() => openEdit(p.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Infinite scroll */}
      {!q.isLoading && !q.isError && products.length > 0 && (
        <div className={cn('py-6')}>
          <InfiniteSentinel
            hasMore={!!q.hasNextPage}
            loading={q.isFetchingNextPage}
            onLoadMore={q.fetchNextPage}
          />
        </div>
      )}

      {/* Bulk actions */}
      <BulkActionBar
        count={sel.count}
        pending={pm.bulkPending}
        onClear={sel.clear}
        actions={bulkActions}
      />

      {/* Editor */}
      {editorOpen && (
        <ProductEditor productId={editingId} isNew={isNew} onClose={closeEditor} />
      )}
    </div>
  );
}
