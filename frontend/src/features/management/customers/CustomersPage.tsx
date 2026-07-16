import { useState } from 'react';

import { Avatar, Badge, Button, Icon, Input } from '@/design-system';
import { formatMoney } from '@/features/ordering';
import { qk, usePaginatedResource } from '@/platform/query';
import { ExportButton, FilterChip, ManagementPage, ManagementTable } from '../components';
import { customerService, type CustomerFilters } from '../services';
import type { Customer } from '../types';
import type { Column } from '../components';
import { CustomerDetailDrawer } from './CustomerDetailDrawer';

/** /dashboard/customers — customer directory (Customer Platform). */
export function CustomersPage() {
  const [filters, setFilters] = useState<CustomerFilters>({});
  const [detailId, setDetailId] = useState<string | undefined>();
  const q = usePaginatedResource<Customer>(qk('mgmt', 'customers', filters), (page, limit) => customerService.list(filters, page, limit), { limit: 25 });

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Customer', render: (c) => (
      <div className="flex items-center gap-2.5"><Avatar alt={c.name ?? 'Guest'} size="sm" /><div className="min-w-0"><p className="truncate font-medium text-foreground">{c.name ?? 'Guest'}</p><p className="truncate text-xs text-foreground-muted">{c.phone ?? c.email ?? '—'}</p></div></div>
    ) },
    { key: 'tier', header: 'Tier', render: (c) => c.tier ? <Badge tone="accent" variant="soft">{c.tier}</Badge> : <span className="text-foreground-subtle">—</span> },
    { key: 'points', header: 'Points', align: 'right', render: (c) => <span className="tabular-nums">{c.points ?? 0}</span> },
    { key: 'orders', header: 'Orders', align: 'right', render: (c) => <span className="tabular-nums">{c.ordersCount ?? 0}</span> },
    { key: 'spent', header: 'Spent', align: 'right', render: (c) => <span className="font-medium tabular-nums">{formatMoney(c.totalSpent)}</span> },
    { key: 'last', header: 'Last order', align: 'right', render: (c) => <span className="text-sm text-foreground-muted">{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '—'}</span> },
  ];

  return (
    <ManagementPage title="Customers" description="Profiles, loyalty, favorites, and marketing preferences." actions={<ExportButton url={customerService.exportUrl(filters)} filename="customers.csv" />}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <Input value={filters.q ?? ''} onChange={(e) => setFilters({ ...filters, q: e.target.value || undefined })} placeholder="Search name, phone, email…" className="pl-9" />
        </div>
        <FilterChip active={filters.marketing} icon="mail" onClick={() => setFilters({ ...filters, marketing: filters.marketing ? undefined : true })}>Opted in</FilterChip>
        <FilterChip active={filters.hasOrders} icon="order" onClick={() => setFilters({ ...filters, hasOrders: filters.hasOrders ? undefined : true })}>Has orders</FilterChip>
      </div>

      <ManagementTable columns={columns} rows={q.items} getId={(c) => c.id} loading={q.isLoading} onRowClick={(c) => setDetailId(c.id)} emptyIcon="users" emptyTitle="No customers yet" />

      {(q.hasPrev || q.hasNext) && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={!q.hasPrev} onClick={q.prev}>Previous</Button>
          <span className="text-sm text-foreground-muted">Page {q.page}</span>
          <Button variant="ghost" size="sm" disabled={!q.hasNext} onClick={q.next}>Next</Button>
        </div>
      )}

      {detailId && <CustomerDetailDrawer customerId={detailId} onClose={() => setDetailId(undefined)} />}
    </ManagementPage>
  );
}
