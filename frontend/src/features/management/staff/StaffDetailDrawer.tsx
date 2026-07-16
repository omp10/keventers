import { Avatar, Badge, Button, Spinner, Tabs, TabsContent, TabsList, TabsTrigger, toast } from '@/design-system';
import { qk, queryClient, useMutationResource, useQueryResource } from '@/platform/query';
import { EntityDrawer, StatusPill } from '../components';
import { staffService } from '../services';
import type { AccessLog, Staff, StaffDevice, StaffSession } from '../types';

const STATUS_TONE = { active: 'success', disabled: 'neutral', invited: 'info' } as const;

/** View a staff member: profile + sessions + devices + activity; enable/disable/remove. */
export function StaffDetailDrawer({ staffId, onEdit, onClose }: { staffId: string; onEdit: () => void; onClose: () => void }) {
  const q = useQueryResource<Staff>(qk('mgmt', 'staff', staffId), () => staffService.get(staffId), { enabled: Boolean(staffId) });
  const sessions = useQueryResource<StaffSession[]>(qk('mgmt', 'staff', staffId, 'sessions'), () => staffService.sessions(staffId));
  const devices = useQueryResource<StaffDevice[]>(qk('mgmt', 'staff', staffId, 'devices'), () => staffService.devices(staffId));
  const logs = useQueryResource<AccessLog[]>(qk('mgmt', 'staff', staffId, 'logs'), () => staffService.accessLogs(staffId));

  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: qk('mgmt', 'staff') }); };
  const toggle = useMutationResource<Staff, boolean>((enabled) => staffService.setEnabled(staffId, enabled), { onSuccess: () => { toast.success('Updated'); invalidate(); } });
  const remove = useMutationResource<{ ok: true }, void>(() => staffService.remove(staffId), { onSuccess: () => { toast.success('Removed'); invalidate(); onClose(); } });

  const s = q.data;

  return (
    <EntityDrawer open onClose={onClose} size="xl" title={s ? s.name : 'Staff'}>
      {q.isLoading || !s ? (
        <div className="grid h-40 place-items-center"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar alt={s.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-foreground">{s.name}</p>
              <p className="truncate text-sm text-foreground-muted">{s.email}</p>
            </div>
            <StatusPill tone={STATUS_TONE[s.status]}>{s.status}</StatusPill>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" leftIcon="edit" onClick={onEdit}>Edit</Button>
            <Button size="sm" variant={s.status === 'disabled' ? 'primary' : 'ghost'} loading={toggle.isPending} onClick={() => toggle.mutate(s.status === 'disabled')}>
              {s.status === 'disabled' ? 'Enable' : 'Disable'}
            </Button>
            <Button size="sm" variant="ghost" className="text-danger" loading={remove.isPending} onClick={() => remove.mutate()}>Remove</Button>
          </div>

          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="devices">Devices</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <dl className="grid grid-cols-2 gap-3 pt-2 text-sm">
                <Meta label="Role" value={s.role} />
                <Meta label="Department" value={s.department} />
                <Meta label="Branches" value={s.branchNames?.join(', ')} />
                <Meta label="Phone" value={s.phone} />
                <Meta label="Last login" value={s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleString() : '—'} />
              </dl>
              {s.roles && s.roles.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{s.roles.map((r) => <Badge key={r} tone="neutral" variant="soft">{r}</Badge>)}</div>}
            </TabsContent>

            <TabsContent value="sessions">
              <RowList loading={sessions.isLoading} rows={sessions.data ?? []} empty="No active sessions" render={(x: StaffSession) => (
                <div key={x.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                  <span>{x.device ?? 'Unknown device'} · {x.location ?? x.ip ?? ''}</span>
                  <span className="text-foreground-muted">{x.current ? 'Current' : new Date(x.lastActiveAt).toLocaleString()}</span>
                </div>
              )} />
            </TabsContent>
            <TabsContent value="devices">
              <RowList loading={devices.isLoading} rows={devices.data ?? []} empty="No devices" render={(x: StaffDevice) => (
                <div key={x.id} className="flex items-center justify-between border-b border-border py-2 text-sm">
                  <span>{x.name}{x.trusted ? ' · trusted' : ''}</span>
                  <span className="text-foreground-muted">{new Date(x.lastUsedAt).toLocaleDateString()}</span>
                </div>
              )} />
            </TabsContent>
            <TabsContent value="activity">
              <RowList loading={logs.isLoading} rows={logs.data ?? []} empty="No activity" render={(x: AccessLog) => (
                <div key={x.id} className="border-b border-border py-2 text-sm">
                  <p className="font-medium text-foreground">{x.action}</p>
                  <p className="text-xs text-foreground-muted">{new Date(x.at).toLocaleString()}{x.ip ? ` · ${x.ip}` : ''}</p>
                </div>
              )} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </EntityDrawer>
  );
}

function Meta({ label, value }: { label: string; value?: string }) {
  return <div><dt className="text-xs text-foreground-subtle">{label}</dt><dd className="font-medium text-foreground">{value || '—'}</dd></div>;
}
function RowList<T>({ loading, rows, empty, render }: { loading?: boolean; rows: T[]; empty: string; render: (x: T) => React.ReactNode }) {
  if (loading) return <div className="grid h-20 place-items-center"><Spinner /></div>;
  if (rows.length === 0) return <p className="py-4 text-sm text-foreground-subtle">{empty}</p>;
  return <div className="pt-2">{rows.map(render)}</div>;
}
