import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Badge, Button, Card, Field, Icon, Input, Switch, Textarea, toast } from '@/design-system';
import { EntityDrawer, ImageUploadField, ManagementPage, ManagementTable, StatusPill, type Column } from '@/features/management/components';
import { qk, queryClient, usePaginatedResource, useQueryResource } from '@/platform/query';
import { cn } from '@/lib/cn';
import { adminService } from '../admin.service';
import type { AdminKitchen, KitchenService, RestaurantOption, ServiceMode } from '../types';

const KEY = qk('admin', 'kitchens');
const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

const SERVICE_MODES: { mode: ServiceMode; label: string }[] = [
  { mode: 'dine_in', label: 'Dine-in' },
  { mode: 'takeaway', label: 'Takeaway' },
  { mode: 'delivery', label: 'Delivery' },
  { mode: 'drive_thru', label: 'Drive-thru' },
  { mode: 'curbside', label: 'Curbside' },
];

type KitchenDraft = Partial<AdminKitchen> & { id?: string };

const emptyKitchen = (restaurantId = ''): KitchenDraft => ({
  name: '',
  code: '',
  slug: '',
  status: 'active',
  restaurantId,
  address: { line1: '', city: '', state: '', pincode: '' },
  location: { lat: 28.6315, lng: 77.2167 },
  discovery: {
    coverImageUrl: '',
    description: '',
    area: '',
    rating: null,
    ratingCount: 0,
    prepTimeMinutes: null,
    featured: false,
    promoted: false,
    offer: null,
    popularityScore: 0,
    services: [
      { mode: 'dine_in', available: true, etaMinutes: null },
      { mode: 'takeaway', available: true, etaMinutes: 10 },
    ],
  },
  acceptsOnlineOrders: true,
  tableCount: 0,
});

/**
 * KitchensPage — ADMIN management of outlets and, crucially, their DISCOVERY
 * PROFILE: the cover art, area, rating, prep time, offer, service modes and
 * position that decide how (and whether) an outlet appears in the customer app's
 * nearby/trending/featured rails and on its branch page.
 *
 * Every save invalidates the backend's discovery snapshot, so changes surface to
 * customers immediately.
 */
export function KitchensPage() {
  const navigate = useNavigate();
  const q = usePaginatedResource<AdminKitchen>(KEY, (p, l) => adminService.kitchens({}, p, l));
  const restaurants = useQueryResource<RestaurantOption[]>(qk('admin', 'kitchen-restaurants'), () => adminService.kitchenRestaurants());
  const [draft, setDraft] = useState<KitchenDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<AdminKitchen>) => setDraft((d) => ({ ...d, ...p }));
  const patchDiscovery = (p: Partial<AdminKitchen['discovery']>) =>
    setDraft((d) => (d ? { ...d, discovery: { ...(d.discovery as AdminKitchen['discovery']), ...p } } : d));

  const toggleService = (mode: ServiceMode) => {
    const current = draft?.discovery?.services ?? [];
    const existing = current.find((s) => s.mode === mode);
    const next: KitchenService[] = existing
      ? current.filter((s) => s.mode !== mode)
      : [...current, { mode, available: true, etaMinutes: null }];
    patchDiscovery({ services: next });
  };

  const save = async () => {
    if (!draft?.name?.trim()) return toast.error('A kitchen name is required.');
    if (!draft.id && !draft.restaurantId) return toast.error('Pick the restaurant this kitchen belongs to.');
    setSaving(true);
    try {
      const d = draft.discovery as AdminKitchen['discovery'];
      const body: Record<string, unknown> = {
        name: draft.name,
        code: draft.code,
        slug: draft.slug || draft.name,
        status: draft.status,
        address: draft.address,
        location: draft.location,
        acceptsOnlineOrders: draft.acceptsOnlineOrders,
        tableCount: draft.tableCount,
        discovery: {
          ...d,
          // Blank label = no offer badge, rather than an empty ribbon.
          offer: d?.offer?.label ? d.offer : null,
        },
      };
      if (draft.id) await adminService.updateKitchen(draft.id, body);
      else await adminService.createKitchen({ ...body, restaurantId: draft.restaurantId });
      toast.success(draft.id ? 'Kitchen updated' : 'Kitchen created');
      setDraft(null);
      void invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the kitchen');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (k: AdminKitchen) => {
    await adminService.deleteKitchen(k.id);
    toast.success('Kitchen deleted');
    void invalidate();
  };

  const columns: Column<AdminKitchen>[] = [
    {
      key: 'kitchen',
      header: 'Kitchen',
      render: (k) => (
        <div className="flex min-w-0 items-center gap-3">
          {k.discovery.coverImageUrl ? (
            <img src={k.discovery.coverImageUrl} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="grid h-10 w-16 shrink-0 place-items-center rounded-md bg-muted">
              <Icon name="store" className="h-4 w-4 text-foreground-subtle" />
            </span>
          )}
          <div className="min-w-0">
            <strong className="block truncate">{k.name}</strong>
            <p className="truncate text-xs text-foreground-muted">{k.restaurant?.name ?? '—'}{k.discovery.area ? ` · ${k.discovery.area}` : ''}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'badges',
      header: 'Promotion',
      render: (k) => (
        <div className="flex flex-wrap gap-1">
          {k.discovery.featured && <Badge tone="accent" variant="soft">Featured</Badge>}
          {k.discovery.promoted && <Badge tone="info" variant="soft">Promoted</Badge>}
          {k.discovery.offer?.label && <Badge tone="success" variant="soft">Offer</Badge>}
          {!k.discovery.featured && !k.discovery.promoted && !k.discovery.offer?.label && <span className="text-xs text-foreground-subtle">—</span>}
        </div>
      ),
    },
    { key: 'rating', header: 'Rating', render: (k) => (k.discovery.rating ? `${k.discovery.rating} (${k.discovery.ratingCount})` : '—') },
    {
      key: 'discoverable',
      header: 'Discoverable',
      render: (k) =>
        k.slug && k.location ? (
          <Badge tone="success" variant="soft">Live</Badge>
        ) : (
          <Badge tone="warning" variant="soft">{!k.slug ? 'No slug' : 'No location'}</Badge>
        ),
    },
    { key: 'status', header: 'Status', render: (k) => <StatusPill tone={k.status === 'active' ? 'success' : 'neutral'}>{k.status}</StatusPill> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (k) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="secondary" leftIcon="eye" onClick={(e) => { e.stopPropagation(); navigate(`/admin/kitchens/${k.id}`); }}>
            View details
          </Button>
          <Button size="sm" variant="ghost" leftIcon="edit" aria-label={`Edit ${k.name}`} onClick={(e) => { e.stopPropagation(); setDraft({ ...k }); }} />
          <Button size="sm" variant="ghost" leftIcon="delete" aria-label={`Delete ${k.name}`} onClick={(e) => { e.stopPropagation(); void remove(k); }} />
        </div>
      ),
    },
  ];

  const d = draft?.discovery as AdminKitchen['discovery'] | undefined;

  return (
    <ManagementPage
      title="Kitchens"
      description="Outlets and the storefront profile customers discover them by."
      actions={<Button leftIcon="add" onClick={() => setDraft(emptyKitchen(restaurants.data?.[0]?.id))}>New kitchen</Button>}
    >
      <ManagementTable
        rows={q.items}
        columns={columns}
        getId={(k) => k.id}
        loading={q.isLoading}
        onRowClick={(k) => navigate(`/admin/kitchens/${k.id}`)}
        emptyTitle="No kitchens yet"
        emptyDescription="Add an outlet to make it discoverable in the customer app."
        emptyIcon="store"
      />

      <EntityDrawer
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? draft.name || 'Edit kitchen' : 'New kitchen'}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button loading={saving} onClick={() => void save()}>{draft?.id ? 'Save changes' : 'Create kitchen'}</Button>
          </div>
        }
      >
        {draft && d && (
          <>
            {!draft.id && (
              <Field label="Restaurant" required description="Which brand this outlet belongs to.">
                <div className="grid gap-1.5">
                  {(restaurants.data ?? []).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => patch({ restaurantId: r.id })}
                      className={cn(
                        'flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        draft.restaurantId === r.id ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:border-primary/40',
                      )}
                    >
                      {r.name}
                      <Badge tone="neutral" variant="soft">{r.status}</Badge>
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kitchen name" required>
                <Input value={draft.name ?? ''} onChange={(e) => patch({ name: e.target.value })} placeholder="Keventers Connaught Place" />
              </Field>
              <Field label="Code">
                <Input value={draft.code ?? ''} onChange={(e) => patch({ code: e.target.value })} placeholder="KV-CP-01" />
              </Field>
            </div>

            <Field label="URL slug" description="Customer link: /r/<slug>. Leave blank to generate from the name.">
              <Input value={draft.slug ?? ''} onChange={(e) => patch({ slug: e.target.value })} placeholder="keventers-connaught-place" />
            </Field>

            <ImageUploadField
              label="Cover image"
              hint="Shown on discovery cards and the branch page."
              value={d.coverImageUrl}
              onChange={(url) => patchDiscovery({ coverImageUrl: url })}
              upload={(file, onProgress) => adminService.uploadImage(file, 'kitchens', onProgress)}
            />

            <Field label="Description">
              <Textarea rows={3} value={d.description} onChange={(e) => patchDiscovery({ description: e.target.value })} placeholder="Freshly shaken classics and seasonal specials." />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Area" description="Neighbourhood shown on cards.">
                <Input value={d.area} onChange={(e) => patchDiscovery({ area: e.target.value })} placeholder="Connaught Place" />
              </Field>
              <Field label="City">
                <Input value={draft.address?.city ?? ''} onChange={(e) => patch({ address: { ...(draft.address ?? { line1: '', city: '', state: '', pincode: '' }), city: e.target.value } })} placeholder="New Delhi" />
              </Field>
            </div>

            <Field label="Street address">
              <Input value={draft.address?.line1 ?? ''} onChange={(e) => patch({ address: { ...(draft.address ?? { line1: '', city: '', state: '', pincode: '' }), line1: e.target.value } })} placeholder="A-1 Connaught Place" />
            </Field>

            <Card padding="md" className="space-y-4 bg-surface-raised">
              <p className="text-sm font-medium text-foreground">Map position</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Latitude">
                  <Input type="number" step="0.0001" value={String(draft.location?.lat ?? '')} onChange={(e) => patch({ location: { lat: Number(e.target.value), lng: draft.location?.lng ?? 0 } })} />
                </Field>
                <Field label="Longitude">
                  <Input type="number" step="0.0001" value={String(draft.location?.lng ?? '')} onChange={(e) => patch({ location: { lat: draft.location?.lat ?? 0, lng: Number(e.target.value) } })} />
                </Field>
              </div>
              <p className="text-xs text-foreground-subtle">Without a position the kitchen can't rank in nearby results.</p>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Rating" description="0–5">
                <Input type="number" step="0.1" min="0" max="5" value={String(d.rating ?? '')} onChange={(e) => patchDiscovery({ rating: e.target.value ? Number(e.target.value) : null })} />
              </Field>
              <Field label="Rating count">
                <Input type="number" min="0" value={String(d.ratingCount ?? 0)} onChange={(e) => patchDiscovery({ ratingCount: Number(e.target.value) })} />
              </Field>
              <Field label="Prep time (min)">
                <Input type="number" min="0" value={String(d.prepTimeMinutes ?? '')} onChange={(e) => patchDiscovery({ prepTimeMinutes: e.target.value ? Number(e.target.value) : null })} />
              </Field>
            </div>

            <Field label="Service modes" description="What customers can order here.">
              <div className="flex flex-wrap gap-2">
                {SERVICE_MODES.map((s) => {
                  const on = d.services.some((x) => x.mode === s.mode);
                  return (
                    <button
                      key={s.mode}
                      type="button"
                      onClick={() => toggleService(s.mode)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        on ? 'border-primary bg-primary-soft text-primary' : 'border-border text-foreground-muted hover:border-primary/40',
                      )}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Card padding="md" className="space-y-4 bg-surface-raised">
              <p className="text-sm font-medium text-foreground">Promotion</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Featured" orientation="horizontal" description="Show in the Featured rail.">
                  <Switch checked={d.featured} onCheckedChange={(on) => patchDiscovery({ featured: on })} />
                </Field>
                <Field label="Promoted" orientation="horizontal" description="Boosted placement.">
                  <Switch checked={d.promoted} onCheckedChange={(on) => patchDiscovery({ promoted: on })} />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Offer label" description="Blank = no offer badge.">
                  <Input value={d.offer?.label ?? ''} onChange={(e) => patchDiscovery({ offer: { label: e.target.value, description: d.offer?.description ?? '' } })} placeholder="20% off on classic shakes" />
                </Field>
                <Field label="Offer details">
                  <Input value={d.offer?.description ?? ''} onChange={(e) => patchDiscovery({ offer: { label: d.offer?.label ?? '', description: e.target.value } })} placeholder="Weekdays 2–5 pm" />
                </Field>
              </div>
              <Field label="Popularity score" description="Ranks the Trending rail. Higher shows first.">
                <Input type="number" min="0" value={String(d.popularityScore ?? 0)} onChange={(e) => patchDiscovery({ popularityScore: Number(e.target.value) })} />
              </Field>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Accepting online orders" orientation="horizontal">
                <Switch checked={Boolean(draft.acceptsOnlineOrders)} onCheckedChange={(on) => patch({ acceptsOnlineOrders: on })} />
              </Field>
              <Field label="Tables">
                <Input type="number" min="0" value={String(draft.tableCount ?? 0)} onChange={(e) => patch({ tableCount: Number(e.target.value) })} />
              </Field>
            </div>
          </>
        )}
      </EntityDrawer>
    </ManagementPage>
  );
}
