import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge, Button, Card, Icon, Input, Spinner, toast } from '@/design-system';
import { qk, queryClient, usePaginatedResource, useQueryResource } from '@/platform/query';
import { adminService } from './admin.service';
import type { Brand } from './types';

const field = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary';

const BRAND_TYPES = [
  ['qsr', 'Quick service'], ['casual_dining', 'Casual dining'], ['fine_dining', 'Fine dining'],
  ['cafe', 'Café'], ['cloud_kitchen', 'Cloud kitchen'], ['bakery', 'Bakery'],
  ['food_truck', 'Food truck'], ['dessert', 'Dessert'],
] as const;

function CreateBrandDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const orgs = useQueryResource(qk('admin', 'orgs-for-brand'), () => adminService.organizations({}, 1, 100), { enabled: open });
  const [organizationId, setOrganizationId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('qsr');
  const [cuisines, setCuisines] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!organizationId || !name.trim() || busy) return;
    setBusy(true);
    try {
      const brand = await adminService.createBrand({
        organizationId,
        name: name.trim(),
        type,
        cuisines: cuisines.split(',').map((c) => c.trim()).filter(Boolean),
      });
      toast.success('Brand created', { description: 'Now add its menu and attach outlets.' });
      void queryClient.invalidateQueries({ queryKey: qk('admin', 'brands') });
      onCreated(brand.id);
    } catch (e) {
      toast.error('Could not create the brand', { description: (e as Error).message });
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex justify-end bg-overlay/50" onClick={onClose}>
      <div className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-surface p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Create brand</h2>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted">
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-foreground-muted">
          A brand owns the menu, coupons and loyalty rule. Outlets are attached to it afterwards.
        </p>

        <label className="block text-sm font-medium text-foreground">
          Organization
          <select className={field + ' mt-1'} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
            <option value="">Choose an organization…</option>
            {(orgs.data?.items ?? []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-foreground">
          Brand name
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Keventers" className="mt-1" />
        </label>
        <label className="block text-sm font-medium text-foreground">
          Type
          <select className={field + ' mt-1'} value={type} onChange={(e) => setType(e.target.value)}>
            {BRAND_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-foreground">
          Cuisines <span className="font-normal text-foreground-subtle">comma separated</span>
          <Input value={cuisines} onChange={(e) => setCuisines(e.target.value)} placeholder="Desserts, Beverages" className="mt-1" />
        </label>

        <Button className="mt-auto w-full" onClick={() => void submit()} loading={busy} disabled={!organizationId || !name.trim()}>
          Create brand
        </Button>
      </div>
    </div>
  );
}

/**
 * AdminBrandsPage — the missing middle of the hierarchy.
 *
 * Organization > BRAND > Outlet. The admin panel could reach the organization
 * and the outlets but never the brand between them, which is the thing that
 * actually owns the shared menu, coupons and loyalty rule. ("Restaurants" in the
 * nav used to render the Organizations page.)
 */
export function AdminBrandsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const list = usePaginatedResource<Brand>(qk('admin', 'brands', search), (p, limit) =>
    adminService.brands({ search: search || undefined }, p, limit),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Brands</h1>
          <p className="text-sm text-foreground-muted">
            A brand owns the shared menu, coupons and loyalty rule. Outlets attach to it.
          </p>
        </div>
        <Button leftIcon="add" onClick={() => setCreating(true)}>Create brand</Button>
      </div>

      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search brands…" className="max-w-sm" />

      {list.isLoading ? (
        <div className="grid min-h-40 place-items-center"><Spinner /></div>
      ) : list.items.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Icon name="utensils" className="mx-auto h-8 w-8 text-foreground-subtle" />
          <p className="mt-2 text-sm text-foreground-muted">No brands found.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.items.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => navigate(`/admin/restaurants/${b.id}`)}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition hover:border-primary hover:shadow-sm"
            >
              {b.branding?.logoUrl ? (
                <img src={b.branding.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted">
                  <Icon name="utensils" className="h-5 w-5 text-foreground-subtle" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{b.name}</p>
                <p className="truncate text-xs text-foreground-muted">{b.organization?.name ?? '—'}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge tone={b.status === 'active' ? 'success' : 'neutral'} variant="soft" className="text-[0.625rem]">{b.status}</Badge>
                  <span className="text-xs text-foreground-subtle">
                    {b.outletCount ?? 0} outlet{(b.outletCount ?? 0) === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-foreground-subtle" />
            </button>
          ))}
        </div>
      )}

      <CreateBrandDrawer
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => { setCreating(false); navigate(`/admin/restaurants/${id}`); }}
      />
    </div>
  );
}
