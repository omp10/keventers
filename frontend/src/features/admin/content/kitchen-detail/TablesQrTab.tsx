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
      <div className="space-y-4">
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StorefrontQr kitchen={k} />

      {!tables.items.length ? (
        <EmptyState
          title="No tables at this outlet"
          description="Tables are set up in the restaurant dashboard. Each one gets its own QR that seats the guest at that table — the storefront code above works without one."
          icon={<Icon name="grid" className="mb-4 h-10 w-10 text-foreground-subtle" />}
        />
      ) : (
        <>
          <p className="text-sm text-foreground-muted">
            {tables.meta?.total ?? tables.items.length} table{(tables.meta?.total ?? 0) === 1 ? '' : 's'} at this outlet. Select one to inspect its QR code.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tables.items.map((t) => (
              <TableCard key={t.id} table={t} onSelect={() => setSelected(t)} />
            ))}
          </div>
        </>
      )}

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

/**
 * StorefrontQr — the outlet's DEFAULT code, always present.
 *
 * Table QR codes are minted records: each one is signed, tied to a table, and
 * opens a seated ordering session — so a table with no code says "No QR", which
 * is honest but useless if all you want is a code that shows people the menu.
 *
 * This one needs no record at all. It's the outlet's public storefront URL
 * rendered as a QR, so it always exists the moment the branch has a slug: print
 * it on a poster, a flyer or the counter and it opens the menu. It does NOT seat
 * a guest at a table — that's what the per-table codes below are for.
 */
function StorefrontQr({ kitchen: k }: { kitchen: AdminKitchen }) {
  if (!k.slug) {
    return (
      <Card padding="md" className="space-y-2">
        <SectionHeading icon="qrCode">Storefront QR</SectionHeading>
        <p className="text-sm text-warning">
          This outlet has no URL slug, so it has no public page for a QR to point at. Add a slug in the kitchen's
          profile to make it reachable.
        </p>
      </Card>
    );
  }

  // The customer app is served from this same origin.
  const menuUrl = `${window.location.origin}/r/${k.slug}/menu`;

  return (
    <Card padding="md">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* QRCode supplies its own padded, surface-coloured frame — no wrapper. */}
        <div className="mx-auto shrink-0 sm:mx-0">
          <QRCode value={menuUrl} size={148} aria-label={`Storefront QR for ${k.name}`} />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <SectionHeading icon="qrCode">Storefront QR</SectionHeading>
            <p className="mt-1 text-sm text-foreground-muted">
              Always available. Scanning opens <strong>{k.name}</strong>'s menu — no table, so it suits posters,
              flyers and takeaway counters.
            </p>
          </div>

          <code className="block truncate rounded bg-muted px-2 py-1 text-xs">{menuUrl}</code>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              leftIcon="copy"
              onClick={() => {
                void navigator.clipboard.writeText(menuUrl);
                toast.success('Menu link copied');
              }}
            >
              Copy link
            </Button>
            <Button size="sm" variant="ghost" leftIcon="linkOut" onClick={() => window.open(menuUrl, '_blank', 'noopener')}>
              Open menu
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SectionHeading({ icon, children }: { icon: 'qrCode'; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
      <Icon name={icon} className="h-4 w-4 text-foreground-subtle" />
      {children}
    </p>
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
        title="No table QR generated yet"
        description="A table QR seats the guest at this exact table when scanned, and has to be minted and signed by the restaurant dashboard's QR settings. The outlet's storefront QR works today for menu browsing."
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
