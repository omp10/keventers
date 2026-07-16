import { useMemo, useState } from 'react';

import { cn } from '@/lib/cn';
import { Button, Icon, Spinner, type IconName } from '@/design-system';
import { MenuBoard, type Product } from '@/features/ordering';
import { useCategoryTree, useProducts } from '../hooks';
import { buildBranchMenu } from './mappers';

type Device = 'desktop' | 'tablet' | 'mobile';

const DEVICES: { id: Device; label: string; icon: IconName }[] = [
  { id: 'desktop', label: 'Desktop', icon: 'dashboard' },
  { id: 'tablet', label: 'Tablet', icon: 'grid' },
  { id: 'mobile', label: 'Mobile', icon: 'store' },
];

/** Frame width per device — desktop fills up to a max, tablet/mobile are fixed. */
const FRAME_WIDTH: Record<Device, string> = {
  desktop: 'w-full max-w-[1100px]',
  tablet: 'w-[760px] max-w-full',
  mobile: 'w-[390px] max-w-full',
};

const noop = () => {};

/**
 * MenuPreview — a live, read-only "customer menu" rendered inside a device frame.
 * It reuses the real ordering MenuBoard/ProductCard against the current catalog
 * data (React Query cache), so edits made elsewhere in the admin show up here.
 */
export function MenuPreview() {
  const [device, setDevice] = useState<Device>('desktop');

  const categoriesQuery = useCategoryTree();
  const productsQuery = useProducts({});

  const products = useMemo(
    () => productsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [productsQuery.data],
  );
  const branchMenu = useMemo(
    () => buildBranchMenu(categoriesQuery.data ?? [], products),
    [categoriesQuery.data, products],
  );

  const isLoading = categoriesQuery.isLoading || productsQuery.isLoading;
  const isEmpty = !isLoading && branchMenu.products.length === 0;

  const refresh = () => {
    void categoriesQuery.refetch();
    void productsQuery.refetch();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar: device toggle + live status + refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Preview device"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 p-1"
        >
          {DEVICES.map((d) => (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={device === d.id}
              onClick={() => setDevice(d.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
                device === d.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-foreground-muted hover:text-foreground',
              )}
            >
              <Icon name={d.icon} className="h-4 w-4" />
              {d.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" aria-hidden />
            Live
          </span>
          <Button variant="outline" size="sm" leftIcon="refresh" onClick={refresh}>
            Refresh
          </Button>
        </div>
      </div>

      <p className="text-xs text-foreground-subtle">Reflects your latest catalog changes.</p>

      {/* Device frame */}
      <div className="flex justify-center">
        <div
          className={cn(
            'overflow-hidden rounded-3xl border border-border bg-background shadow-lg transition-[width] duration-300',
            FRAME_WIDTH[device],
          )}
        >
          <div className="max-h-[75vh] overflow-y-auto p-4">
            {isLoading ? (
              <div className="grid place-items-center py-24">
                <Spinner />
              </div>
            ) : isEmpty ? (
              <div className="grid place-items-center gap-3 py-24 text-center">
                <Icon name="utensils" className="h-10 w-10 text-foreground-subtle" />
                <div>
                  <p className="text-sm font-medium text-foreground">Nothing to preview yet</p>
                  <p className="mt-1 text-sm text-foreground-muted">
                    Add categories and products to see your customer menu come to life.
                  </p>
                </div>
              </div>
            ) : (
              <MenuBoard
                menu={branchMenu}
                onAdd={noop as (p: Product) => void}
                onOpen={noop as (p: Product) => void}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
