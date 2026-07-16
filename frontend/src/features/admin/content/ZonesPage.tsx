import { useState } from 'react';

import { Badge, Button, Card, Field, Input, Textarea, toast } from '@/design-system';
import { EntityDrawer, ManagementPage, ManagementTable, StatusPill, type Column } from '@/features/management/components';
import { qk, queryClient, usePaginatedResource } from '@/platform/query';
import { cn } from '@/lib/cn';
import { adminService } from '../admin.service';
import type { AdminZone, ZoneStatus } from '../types';

const KEY = qk('admin', 'zones');
const invalidate = () => queryClient.invalidateQueries({ queryKey: KEY });

const STATUS_TONE: Record<ZoneStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  paused: 'warning',
  inactive: 'neutral',
};

const emptyZone = (): Partial<AdminZone> => ({
  name: '',
  code: '',
  city: '',
  type: 'delivery',
  center: { lat: 28.6315, lng: 77.2167 },
  radiusKm: 5,
  deliveryFee: 0,
  minOrderAmount: 0,
  sortOrder: 0,
  status: 'active',
});

/**
 * ZonesPage — ADMIN definition of operating (delivery/service) coverage. A zone
 * is a pin plus a radius, which is how coverage is actually reasoned about;
 * serviceability decisions stay backend-owned, this curates the data they read.
 */
export function ZonesPage() {
  const q = usePaginatedResource<AdminZone>(KEY, (p, l) => adminService.zones({}, p, l));
  const [draft, setDraft] = useState<Partial<AdminZone> | null>(null);
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<AdminZone>) => setDraft((d) => ({ ...d, ...p }));
  const patchCenter = (p: Partial<{ lat: number; lng: number }>) =>
    setDraft((d) => ({ ...d, center: { lat: d?.center?.lat ?? 0, lng: d?.center?.lng ?? 0, ...p } }));

  const save = async () => {
    if (!draft?.name?.trim()) return toast.error('A zone name is required.');
    if (!Number.isFinite(draft.center?.lat) || !Number.isFinite(draft.center?.lng)) {
      return toast.error('Set a valid center latitude and longitude.');
    }
    setSaving(true);
    try {
      if (draft.id) await adminService.updateZone(draft.id, draft);
      else await adminService.createZone(draft);
      toast.success(draft.id ? 'Zone updated' : 'Zone created');
      setDraft(null);
      void invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the zone');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (z: AdminZone) => {
    await adminService.deleteZone(z.id);
    toast.success('Zone deleted');
    void invalidate();
  };

  const cycleStatus = async (z: AdminZone) => {
    const next: ZoneStatus = z.status === 'active' ? 'paused' : 'active';
    await adminService.updateZone(z.id, { status: next });
    toast.success(next === 'active' ? 'Zone resumed' : 'Zone paused');
    void invalidate();
  };

  const columns: Column<AdminZone>[] = [
    {
      key: 'zone',
      header: 'Zone',
      render: (z) => (
        <div className="min-w-0">
          <strong className="block truncate">{z.name}</strong>
          <p className="truncate text-xs text-foreground-muted">{[z.code, z.city].filter(Boolean).join(' · ') || '—'}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (z) => <Badge tone="neutral" variant="soft">{z.type}</Badge> },
    { key: 'coverage', header: 'Coverage', render: (z) => `${z.radiusKm} km radius` },
    {
      key: 'center',
      header: 'Center',
      render: (z) => <span className="font-mono text-xs text-foreground-muted">{z.center.lat.toFixed(3)}, {z.center.lng.toFixed(3)}</span>,
    },
    { key: 'eta', header: 'ETA', render: (z) => (z.etaMinutes ? `${z.etaMinutes} min` : '—') },
    { key: 'status', header: 'Status', render: (z) => <StatusPill tone={STATUS_TONE[z.status]}>{z.status}</StatusPill> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (z) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); void cycleStatus(z); }}>
            {z.status === 'active' ? 'Pause' : 'Resume'}
          </Button>
          <Button size="sm" variant="ghost" leftIcon="delete" aria-label={`Delete ${z.name}`} onClick={(e) => { e.stopPropagation(); void remove(z); }} />
        </div>
      ),
    },
  ];

  return (
    <ManagementPage
      title="Operating zones"
      description="Delivery and service coverage areas — a center pin plus a radius."
      actions={<Button leftIcon="add" onClick={() => setDraft(emptyZone())}>New zone</Button>}
    >
      <ManagementTable
        rows={q.items}
        columns={columns}
        getId={(z) => z.id}
        loading={q.isLoading}
        onRowClick={(z) => setDraft({ ...z })}
        emptyTitle="No zones yet"
        emptyDescription="Define the areas you operate in to control delivery coverage."
        emptyIcon="map"
      />

      <EntityDrawer
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit zone' : 'New zone'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button loading={saving} onClick={() => void save()}>{draft?.id ? 'Save changes' : 'Create zone'}</Button>
          </div>
        }
      >
        {draft && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Zone name" required>
                <Input value={draft.name ?? ''} onChange={(e) => patch({ name: e.target.value })} placeholder="Central Delhi" />
              </Field>
              <Field label="Code" description="Short reference, e.g. CD.">
                <Input value={draft.code ?? ''} onChange={(e) => patch({ code: e.target.value.toUpperCase() })} placeholder="CD" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City">
                <Input value={draft.city ?? ''} onChange={(e) => patch({ city: e.target.value })} placeholder="New Delhi" />
              </Field>
              <Field label="Zone type">
                <div className="grid grid-cols-2 gap-2">
                  {(['delivery', 'service'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => patch({ type: t })}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        draft.type === t ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:border-primary/40',
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <Field label="Description">
              <Textarea rows={2} value={draft.description ?? ''} onChange={(e) => patch({ description: e.target.value })} placeholder="Covers CP, Karol Bagh and Paharganj." />
            </Field>

            <Card padding="md" className="space-y-4 bg-surface-raised">
              <p className="text-sm font-medium text-foreground">Coverage circle</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Center latitude" required>
                  <Input type="number" step="0.0001" value={String(draft.center?.lat ?? '')} onChange={(e) => patchCenter({ lat: Number(e.target.value) })} />
                </Field>
                <Field label="Center longitude" required>
                  <Input type="number" step="0.0001" value={String(draft.center?.lng ?? '')} onChange={(e) => patchCenter({ lng: Number(e.target.value) })} />
                </Field>
                <Field label="Radius (km)" required>
                  <Input type="number" step="0.5" min="0.1" value={String(draft.radiusKm ?? 5)} onChange={(e) => patch({ radiusKm: Number(e.target.value) })} />
                </Field>
              </div>
              <p className="text-xs text-foreground-subtle">
                Tip: copy coordinates from Google Maps (right-click a spot → the lat, lng pair).
              </p>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Delivery fee (₹)">
                <Input type="number" min="0" value={String(draft.deliveryFee ?? 0)} onChange={(e) => patch({ deliveryFee: Number(e.target.value) })} />
              </Field>
              <Field label="Min order (₹)">
                <Input type="number" min="0" value={String(draft.minOrderAmount ?? 0)} onChange={(e) => patch({ minOrderAmount: Number(e.target.value) })} />
              </Field>
              <Field label="ETA (minutes)">
                <Input type="number" min="0" value={String(draft.etaMinutes ?? '')} onChange={(e) => patch({ etaMinutes: e.target.value ? Number(e.target.value) : null })} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Display order">
                <Input type="number" value={String(draft.sortOrder ?? 0)} onChange={(e) => patch({ sortOrder: Number(e.target.value) })} />
              </Field>
              <Field label="Status">
                <div className="grid grid-cols-3 gap-1.5">
                  {(['active', 'paused', 'inactive'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => patch({ status: s })}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-xs capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        draft.status === s ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:border-primary/40',
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </>
        )}
      </EntityDrawer>
    </ManagementPage>
  );
}
