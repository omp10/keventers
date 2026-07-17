import { useState } from 'react';

import { Badge, Button, Card, EmptyState, Icon, QRCode, Skeleton, toast } from '@/design-system';
import { EntityDrawer, StatusPill, type StatusTone } from '@/features/management/components';
import { qk, queryClient, usePaginatedResource, useQueryResource } from '@/platform/query';
import { cn } from '@/lib/cn';

import { adminService } from '../../admin.service';
import type { AdminKitchen, KitchenQrCode, KitchenTable } from '../../types';

const TABLE_TONES: Record<string, StatusTone> = {
  available: 'success',
  occupied: 'warning',
  reserved: 'info',
  out_of_service: 'neutral',
};

/**
 * TablesQrTab — the tables guests sit at and the QR codes they scan to order.
 * Both belong to THIS outlet alone (unlike the menu), so changes here are safely
 * local.
 *
 * Selecting a table opens its QR codes: the scannable payload rendered live, the
 * scan URL, and the counters that tell you whether a printed code is actually
 * being used.
 */
export function TablesQrTab({ kitchen: k }: { kitchen: AdminKitchen }) {
  const tables = usePaginatedResource<KitchenTable>(qk('admin', 'kitchen-tables', k.id), () =>
    adminService.kitchenTables(k.restaurantId, k.id),
  );
  const [selected, setSelected] = useState<KitchenTable | null>(null);

  if (tables.isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!tables.items.length) {
    return (
      <EmptyState
        title="No tables at this outlet"
        description="Tables are set up in the restaurant dashboard, and each one gets its own QR code."
        icon={<Icon name="grid" className="mb-4 h-10 w-10 text-foreground-subtle" />}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground-muted">
        {tables.meta?.total ?? tables.items.length} table{(tables.meta?.total ?? 0) === 1 ? '' : 's'} at this outlet. Select one to inspect its QR code.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tables.items.map((t) => (
          <TableCard key={t.id} table={t} onSelect={() => setSelected(t)} />
        ))}
      </div>

      <EntityDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.name || `Table ${selected.number}`} · QR` : 'QR'}
        size="md"
      >
        {selected && <TableQrPanel table={selected} />}
      </EntityDrawer>
    </div>
  );
}

function TableCard({ table: t, onSelect }: { table: KitchenTable; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-xl border border-border bg-surface p-3.5 text-left transition-colors',
        'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block truncate text-sm text-foreground">{t.name || `Table ${t.number}`}</strong>
          <p className="text-xs text-foreground-muted">
            Seats {t.seatingCapacity}
            {t.floor ? ` · ${t.floor}` : ''}
            {t.zone ? ` · ${t.zone}` : ''}
          </p>
        </div>
        <StatusPill tone={TABLE_TONES[t.status] ?? 'neutral'}>{t.status.replace(/_/g, ' ')}</StatusPill>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {t.activeQrCodeId ? (
          <Badge tone="success" variant="soft">QR active</Badge>
        ) : (
          <Badge tone="warning" variant="soft">No QR</Badge>
        )}
        {!t.isOrderingEnabled && <Badge tone="neutral" variant="soft">Ordering off</Badge>}
        {t.currentSessionId && <Badge tone="info" variant="soft">Guest seated</Badge>}
      </div>
    </button>
  );
}

function TableQrPanel({ table }: { table: KitchenTable }) {
  const key = qk('admin', 'table-qr', table.id);
  const qr = useQueryResource<KitchenQrCode[]>(key, () => adminService.tableQrCodes(table.id));
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, action: 'regenerate' | 'rotate' | 'disable') => {
    setBusy(id + action);
    try {
      await adminService.qrAction(id, action);
      toast.success(action === 'disable' ? 'QR disabled' : action === 'rotate' ? 'QR secret rotated' : 'QR regenerated');
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not ${action} the QR`);
    } finally {
      setBusy(null);
    }
  };

  if (qr.isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const codes = qr.data ?? [];
  if (!codes.length) {
    return (
      <EmptyState
        title="No QR code for this table"
        description="QR codes are generated from the restaurant dashboard's QR settings. Once printed and scanned, their activity shows up here."
        icon={<Icon name="qrCode" className="mb-4 h-10 w-10 text-foreground-subtle" />}
      />
    );
  }

  return (
    <div className="space-y-4">
      {codes.map((c) => (
        <Card key={c.id} padding="md" className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">{c.type.replace(/_/g, ' ')}</p>
              <p className="text-xs text-foreground-muted">Secret version {c.secretVersion}</p>
            </div>
            <Badge tone={c.status === 'active' ? 'success' : 'neutral'} variant="soft">{c.status}</Badge>
          </div>

          <div className="flex justify-center rounded-lg bg-white p-4">
            <QRCode value={c.scanUrl || c.code} size={180} aria-label={`QR code for table ${table.number}`} />
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-foreground-muted">Scan URL</dt>
              <dd className="min-w-0 flex-1">
                <code className="block truncate rounded bg-muted px-1.5 py-0.5 text-xs">{c.scanUrl}</code>
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-24 shrink-0 text-foreground-muted">Scans</dt>
              <dd className="flex-1 text-foreground">
                {c.scanCount.toLocaleString()}
                {c.lastScannedAt ? ` · last ${new Date(c.lastScannedAt).toLocaleString()}` : ' · never scanned'}
              </dd>
            </div>
            {c.expiresAt && (
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-foreground-muted">Expires</dt>
                <dd className="flex-1 text-foreground">{new Date(c.expiresAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              leftIcon="copy"
              onClick={() => {
                void navigator.clipboard.writeText(c.scanUrl);
                toast.success('Scan URL copied');
              }}
            >
              Copy link
            </Button>
            <Button size="sm" variant="secondary" loading={busy === c.id + 'regenerate'} onClick={() => void act(c.id, 'regenerate')}>
              Regenerate
            </Button>
            <Button size="sm" variant="secondary" loading={busy === c.id + 'rotate'} onClick={() => void act(c.id, 'rotate')}>
              Rotate secret
            </Button>
            {c.status === 'active' && (
              <Button size="sm" variant="ghost" loading={busy === c.id + 'disable'} onClick={() => void act(c.id, 'disable')}>
                Disable
              </Button>
            )}
          </div>

          <p className="flex items-start gap-2 text-xs text-foreground-subtle">
            <Icon name="warning" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Rotating or regenerating invalidates every printed copy of this code.
          </p>
        </Card>
      ))}
    </div>
  );
}
