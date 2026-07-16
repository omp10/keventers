import { useState } from 'react';

import { Avatar, Button, Icon, Input } from '@/design-system';
import { qk, queryClient, usePaginatedResource } from '@/platform/query';
import { BulkActionBar, FilterChip, ManagementPage, ManagementTable, StatusPill, useBulkSelection } from '../components';
import { staffService, type StaffFilters } from '../services';
import type { Staff } from '../types';
import type { Column } from '../components';
import { StaffDrawer } from './StaffDrawer';
import { StaffDetailDrawer } from './StaffDetailDrawer';

const STATUS_TONE = { active: 'success', disabled: 'neutral', invited: 'info' } as const;
const STATUSES = ['active', 'invited', 'disabled'] as const;

/** /dashboard/staff — staff directory (Identity + Organization + RBAC). */
export function StaffPage() {
  const [filters, setFilters] = useState<StaffFilters>({});
  const [invite, setInvite] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [detailId, setDetailId] = useState<string | undefined>();
  const sel = useBulkSelection();

  const q = usePaginatedResource<Staff>(qk('mgmt', 'staff', 'list', filters), (page, limit) => staffService.list(filters, page, limit), { limit: 25 });

  const bulk = async (action: 'enable' | 'disable' | 'remove') => {
    await staffService.bulk(action, sel.ids);
    sel.clear();
    void queryClient.invalidateQueries({ queryKey: qk('mgmt', 'staff') });
  };

  const columns: Column<Staff>[] = [
    { key: 'name', header: 'Staff', render: (s) => (
      <div className="flex items-center gap-2.5">
        <Avatar alt={s.name} size="sm" />
        <div className="min-w-0"><p className="truncate font-medium text-foreground">{s.name}</p><p className="truncate text-xs text-foreground-muted">{s.email}</p></div>
      </div>
    ) },
    { key: 'role', header: 'Role', render: (s) => <StatusPill tone="neutral">{s.role}</StatusPill> },
    { key: 'branches', header: 'Branches', render: (s) => <span className="text-sm text-foreground-muted">{s.branchNames?.join(', ') || '—'}</span> },
    { key: 'department', header: 'Department', render: (s) => <span className="text-sm text-foreground-muted">{s.department || '—'}</span> },
    { key: 'status', header: 'Status', render: (s) => <StatusPill tone={STATUS_TONE[s.status]}>{s.status}</StatusPill> },
    { key: 'login', header: 'Last login', align: 'right', render: (s) => <span className="text-sm text-foreground-muted">{s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString() : '—'}</span> },
  ];

  return (
    <ManagementPage title="Staff" description="Manage staff, roles, branch access, and sessions." actions={<Button leftIcon="add" onClick={() => setInvite(true)}>Invite staff</Button>}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
          <Input value={filters.q ?? ''} onChange={(e) => setFilters({ ...filters, q: e.target.value || undefined })} placeholder="Search staff…" className="pl-9" />
        </div>
        {STATUSES.map((s) => <FilterChip key={s} active={filters.status === s} onClick={() => setFilters({ ...filters, status: filters.status === s ? undefined : s })}>{s}</FilterChip>)}
      </div>

      <ManagementTable columns={columns} rows={q.items} getId={(s) => s.id} loading={q.isLoading} selection={sel} onRowClick={(s) => setDetailId(s.id)} emptyIcon="users" emptyTitle="No staff yet" emptyDescription="Invite your first team member." />

      {(q.hasPrev || q.hasNext) && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" disabled={!q.hasPrev} onClick={q.prev}>Previous</Button>
          <span className="text-sm text-foreground-muted">Page {q.page}</span>
          <Button variant="ghost" size="sm" disabled={!q.hasNext} onClick={q.next}>Next</Button>
        </div>
      )}

      <BulkActionBar count={sel.count} onClear={sel.clear} actions={[
        { key: 'enable', label: 'Enable', icon: 'check', onClick: () => void bulk('enable') },
        { key: 'disable', label: 'Disable', icon: 'eyeOff', onClick: () => void bulk('disable') },
        { key: 'remove', label: 'Remove', icon: 'delete', tone: 'danger', onClick: () => void bulk('remove') },
      ]} />

      {invite && <StaffDrawer isNew onClose={() => setInvite(false)} />}
      {editId && <StaffDrawer staffId={editId} onClose={() => setEditId(undefined)} />}
      {detailId && <StaffDetailDrawer staffId={detailId} onEdit={() => { setEditId(detailId); setDetailId(undefined); }} onClose={() => setDetailId(undefined)} />}
    </ManagementPage>
  );
}
