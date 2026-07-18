import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { Badge, Button, Card, EmptyState, Icon, Input, Skeleton, Switch, ThemeToggleButton, toast } from '@/design-system';
import { api } from '@/platform/api';
import { useAuth } from '@/platform/auth';
import { qk, queryClient, useMutationResource, useQueryResource } from '@/platform/query';
import { cn } from '@/lib/cn';
import { kitchenService } from '../services/kitchen.service';
import { ScannerExperience } from '@/features/discovery';

/* ─────────────────────────── Order History ───────────────────────────────
 * The KDS board deliberately shows only live work; this tab is where finished
 * work goes — served for the record, cancelled for the post-mortem. */

export function KitchenHistoryPage() {
  const [status, setStatus] = useState<'served' | 'cancelled'>('served');
  const [search, setSearch] = useState('');
  const query = useQueryResource(qk('kitchen', 'history', status), () => kitchenService.queue({ status }));

  const items = useMemo(() => {
    const all = query.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (e) => e.orderNumber.toLowerCase().includes(q) || e.items.some((it) => it.name.toLowerCase().includes(q)),
    );
  }, [query.data, search]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Order history</h1>
        <div className="flex gap-1.5">
          {(['served', 'cancelled'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'h-11 rounded-lg px-4 text-sm font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                status === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground-muted hover:text-foreground',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Input type="search" leftIcon="search" placeholder="Search order number or item…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {query.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Icon name="clock" className="mb-3 h-8 w-8 text-foreground-subtle" />} title={`No ${status} orders`} description="Finished orders appear here as the day goes on." />
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <Card key={e.id} padding="md" className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs text-foreground-subtle">{e.orderNumber}</p>
                <p className="truncate text-sm text-foreground">
                  {e.items.map((it) => `${it.quantity}× ${it.name}`).join(', ')}
                </p>
              </div>
              <Badge tone={status === 'served' ? 'success' : 'danger'} variant="soft" className="shrink-0 capitalize">
                {e.status}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────── Menu (86 board) ──────────────────────────
 * Kitchen operators flip items on/off as stock runs out — the restaurant
 * industry's "86 list". Toggles only: pricing/editing stays in the manager
 * dashboard's catalog. */

type MenuProduct = {
  id: string;
  name: string;
  categoryId?: string;
  availability?: { status?: string; unavailableReason?: string };
  status?: string;
};

const menuKey = qk('kitchen', 'menu-products');

export function KitchenMenuPage() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  // limit is validator-capped at 100 — asking for more is a 422, not "extra".
  const query = useQueryResource(menuKey, async () => {
    const page = await api.paginate<MenuProduct>('/restaurant/products', { query: { page: 1, limit: 100, status: 'active' } });
    return page.items;
  });

  const toggle = useMutationResource<unknown, { product: MenuProduct; available: boolean }>(
    ({ product, available }) =>
      api.patch(`/restaurant/products/${product.id}/availability`, {
        status: available ? 'available' : 'out_of_stock',
        ...(available ? {} : { unavailableReason: 'Marked out of stock from the kitchen' }),
      }),
    {
      onSuccess: (_d, { product, available }) => {
        toast.success(`${product.name} ${available ? 'is back on the menu' : 'marked out of stock'}`);
        void queryClient.invalidateQueries({ queryKey: menuKey });
      },
      onError: (err) => toast.error('Could not update availability', { description: err.message }),
    },
  );

  const items = useMemo(() => {
    const all = query.data ?? [];
    const q = search.trim().toLowerCase();
    return q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all;
  }, [query.data, search]);

  const outCount = (query.data ?? []).filter((p) => p.availability?.status && p.availability.status !== 'available').length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">Menu availability</h1>
          {outCount > 0 && <Badge tone="warning" variant="soft">{outCount} out of stock</Badge>}
        </div>
        {/*
          This screen is the 86 board — one tap to pull an item that's run out.
          Creating products means variants, modifiers, pricing and media, which
          the catalog editor already does properly; rebuilding a second editor
          here would only drift from it. So the "add" affordance is a real
          doorway to that editor rather than a dead end — the page used to just
          TELL you edits lived elsewhere and leave you to find it.
        */}
        <Button size="sm" variant="secondary" leftIcon="add" onClick={() => navigate('/dashboard/catalog/products')}>
          Add or edit items
        </Button>
      </div>
      <p className="text-sm text-foreground-muted">
        Flip items off as stock runs out — customers stop seeing them instantly.
      </p>

      <Input type="search" leftIcon="search" placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {query.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : query.isError ? (
        // An error must never masquerade as an empty catalog — a kitchen that
        // believes everything is delisted behaves very differently from one
        // that knows the board is down.
        <EmptyState icon={<Icon name="warning" className="mb-3 h-8 w-8 text-danger" />} title="Couldn't load the menu" description={query.error?.message ?? 'Please try again.'} action={<Button onClick={() => void query.refetch()}>Retry</Button>} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Icon name="utensils" className="mb-3 h-8 w-8 text-foreground-subtle" />}
          title={search ? 'No matching items' : 'No products yet'}
          description={
            search
              ? `Nothing matches "${search}".`
              : "This restaurant's catalog is empty — add your first item to start taking orders."
          }
          action={
            search ? undefined : (
              // Categories FIRST: a product requires a categoryId, so sending a
              // brand-new restaurant straight to the product editor lands them
              // on a form they can't submit.
              <Button leftIcon="add" onClick={() => navigate('/dashboard/catalog/categories')}>
                Set up your menu
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map((p) => {
            const available = !p.availability?.status || p.availability.status === 'available';
            return (
              <Card key={p.id} padding="md" className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn('truncate text-sm font-semibold', available ? 'text-foreground' : 'text-foreground-subtle line-through')}>
                    {p.name}
                  </p>
                  {!available && <p className="text-xs text-warning">Out of stock</p>}
                </div>
                <Switch
                  checked={available}
                  disabled={toggle.isPending}
                  onCheckedChange={(on) => toggle.mutate({ product: p, available: on })}
                  aria-label={`${p.name} availability`}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────── Profile ─────────────────────────────── */

export function KitchenProfilePage() {
  const { user, roles, logout } = useAuth();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);

  const rows: [string, string][] = [
    ['Operator', user?.fullName ?? '—'],
    ['Phone', user?.phone ?? '—'],
    ['Email', user?.email ?? '—'],
    ['Role', roles.join(', ') || '—'],
  ];

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 p-4">
      <h1 className="text-xl font-bold text-foreground">Profile</h1>
      <Card padding="md" className="divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <span className="text-sm text-foreground-muted">{label}</span>
            <span className="min-w-0 truncate text-sm font-medium text-foreground">{value}</span>
          </div>
        ))}
      </Card>

      {/* Scan a table QR — opens that table's live menu (what the diner sees). */}
      <Card padding="md" className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Scan a table QR</p>
          <p className="text-xs text-foreground-muted">Open a table's menu the way a customer sees it.</p>
        </div>
        <Button variant="secondary" leftIcon="qr" onClick={() => setScanning(true)}>Scan</Button>
      </Card>

      <Card padding="md" className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Theme</span>
        <ThemeToggleButton />
      </Card>
      <Button
        variant="secondary"
        fullWidth
        leftIcon="logout"
        onClick={() => void logout().then(() => navigate('/kitchen/login'))}
      >
        Sign out
      </Button>

      {scanning && <KitchenScannerOverlay onClose={() => setScanning(false)} onResolved={(slug) => navigate(`/r/${slug}/menu`)} />}
    </div>
  );
}

/** Full-screen scanner for kitchen staff, portalled over the KDS chrome. */
function KitchenScannerOverlay({ onClose, onResolved }: { onClose: () => void; onResolved: (slug: string) => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">Scan a table QR</h2>
        <Button variant="ghost" size="icon-sm" leftIcon="close" aria-label="Close" onClick={onClose} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <ScannerExperience onResolved={(r) => onResolved(r.branchSlug)} />
      </div>
    </div>,
    document.body,
  );
}
