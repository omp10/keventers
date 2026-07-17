import type { ReactNode } from 'react';

import { Badge, Card, Icon, StatCard } from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { StatusPill } from '@/features/management/components';
import { qk, usePaginatedResource, useQueryResource } from '@/platform/query';

import { adminService } from '../../admin.service';
import type { AdminKitchen, CatalogStats, KitchenOrder, KitchenTable, ServiceMode } from '../../types';

const SERVICE_LABELS: Record<ServiceMode, string> = {
  dine_in: 'Dine-in',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
  drive_thru: 'Drive-thru',
  curbside: 'Curbside',
};

/**
 * OverviewTab — the at-a-glance state of one outlet: how big its menu is, how
 * many tables it seats, what it's recently sold, and the storefront profile that
 * decides whether customers can find it at all.
 */
export function OverviewTab({ kitchen: k }: { kitchen: AdminKitchen }) {
  const stats = useQueryResource<CatalogStats>(qk('admin', 'kitchen-catalog-stats', k.restaurantId), () =>
    adminService.kitchenCatalogStats(k.restaurantId),
  );
  const tables = usePaginatedResource<KitchenTable>(qk('admin', 'kitchen-tables', k.id), () =>
    adminService.kitchenTables(k.restaurantId, k.id),
  );
  const orders = usePaginatedResource<KitchenOrder>(qk('admin', 'kitchen-orders', k.id), (p, l) =>
    adminService.kitchenOrders(k.restaurantId, k.id, p, l),
    { limit: 5 },
  );

  const occupied = tables.items.filter((t) => t.status !== 'available').length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orders"
          value={orders.meta?.total ?? 0}
          icon="order"
          hint="All time at this outlet"
          loading={orders.isLoading}
        />
        <StatCard
          label="Tables"
          value={tables.meta?.total ?? 0}
          icon="grid"
          hint={tables.isLoading ? undefined : `${occupied} in use right now`}
          loading={tables.isLoading}
        />
        <StatCard
          label="Products on the menu"
          value={stats.data?.counts.activeProducts ?? 0}
          icon="utensils"
          hint={stats.data ? `${stats.data.counts.products} total · brand-wide` : undefined}
          loading={stats.isLoading}
        />
        <StatCard
          label="Rating"
          value={k.discovery.rating ?? '—'}
          icon="star"
          hint={k.discovery.ratingCount ? `${k.discovery.ratingCount.toLocaleString()} ratings` : 'Not rated yet'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md" className="space-y-4">
          <SectionTitle icon="store">Storefront profile</SectionTitle>
          <dl className="space-y-3 text-sm">
            <Row label="Description">{k.discovery.description || <Muted>No description</Muted>}</Row>
            <Row label="Area">{k.discovery.area || <Muted>—</Muted>}</Row>
            <Row label="Address">
              {[k.address?.line1, k.address?.city, k.address?.pincode].filter(Boolean).join(', ') || <Muted>—</Muted>}
            </Row>
            <Row label="Prep time">{k.discovery.prepTimeMinutes ? `${k.discovery.prepTimeMinutes} min` : <Muted>—</Muted>}</Row>
            <Row label="Online orders">
              <StatusPill tone={k.acceptsOnlineOrders ? 'success' : 'neutral'}>
                {k.acceptsOnlineOrders ? 'Accepting' : 'Paused'}
              </StatusPill>
            </Row>
          </dl>
        </Card>

        <Card padding="md" className="space-y-4">
          <SectionTitle icon="mapPin">Discoverability</SectionTitle>
          <dl className="space-y-3 text-sm">
            <Row label="Customer link">
              {k.slug ? <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/r/{k.slug}</code> : <Muted>No slug — not reachable</Muted>}
            </Row>
            <Row label="Map position">
              {k.location ? (
                `${k.location.lat.toFixed(4)}, ${k.location.lng.toFixed(4)}`
              ) : (
                <span className="text-warning">No position — can't rank in nearby results</span>
              )}
            </Row>
            <Row label="Popularity">{k.discovery.popularityScore} <Muted>· ranks the Trending rail</Muted></Row>
            <Row label="Service modes">
              <div className="flex flex-wrap gap-1.5">
                {k.discovery.services.length ? (
                  k.discovery.services.map((s) => (
                    <Badge key={s.mode} tone={s.available ? 'neutral' : 'neutral'} variant="soft">
                      {SERVICE_LABELS[s.mode] ?? s.mode}
                      {s.etaMinutes ? ` · ${s.etaMinutes}m` : ''}
                    </Badge>
                  ))
                ) : (
                  <Muted>None enabled</Muted>
                )}
              </div>
            </Row>
          </dl>
        </Card>
      </div>

      <Card padding="md" className="space-y-4">
        <SectionTitle icon="order">Recent orders</SectionTitle>
        {orders.isLoading ? (
          <p className="text-sm text-foreground-muted">Loading orders…</p>
        ) : orders.items.length === 0 ? (
          <p className="text-sm text-foreground-muted">No orders have been placed at this outlet yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.items.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <code className="text-xs text-foreground">{o.orderNumber}</code>
                  <p className="text-xs text-foreground-muted">
                    {o.orderType.replace('_', ' ')} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'}
                    {o.placedAt ? ` · ${new Date(o.placedAt).toLocaleString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="neutral" variant="soft">{o.status}</Badge>
                  <strong className="text-sm tabular-nums">{formatMoney(o.total)}</strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: 'store' | 'mapPin' | 'order'; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium text-foreground">
      <Icon name={icon} className="h-4 w-4 text-foreground-subtle" />
      {children}
    </p>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
      <dt className="w-32 shrink-0 text-foreground-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-foreground">{children}</dd>
    </div>
  );
}

const Muted = ({ children }: { children: ReactNode }) => <span className="text-foreground-subtle">{children}</span>;
