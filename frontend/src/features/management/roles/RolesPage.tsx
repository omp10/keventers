import { useState } from 'react';

import { Badge, Card, Icon, Spinner, Tabs, TabsContent, TabsList, TabsTrigger } from '@/design-system';
import { qk, useQueryResource } from '@/platform/query';
import { ManagementPage } from '../components';
import { roleService, staffService } from '../services';
import type { Role } from '../types';
import { PermissionMatrix } from './PermissionMatrix';

const selectCls = 'h-10 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary';

/** /dashboard/staff/roles — roles, permission matrix, effective-permission preview. */
export function RolesPage() {
  const roles = useQueryResource<Role[]>(qk('mgmt', 'roles'), () => roleService.list());

  return (
    <ManagementPage title="Roles & permissions" description="Backend RBAC — assign roles to staff; view the permission matrix.">
      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="matrix">Permission matrix</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          {roles.isLoading ? (
            <div className="grid h-40 place-items-center"><Spinner /></div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(roles.data ?? []).map((r) => (
                <Card key={r.id} padding="md" className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-semibold text-foreground"><Icon name="users" className="h-4 w-4 text-primary" /> {r.name}</h3>
                    {r.system && <Badge tone="neutral" variant="soft">System</Badge>}
                  </div>
                  {r.description && <p className="text-sm text-foreground-muted">{r.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-foreground-subtle">
                    <span>{r.permissions.length} permissions</span>
                    {r.staffCount != null && <span>· {r.staffCount} staff</span>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="matrix">
          <PermissionMatrix />
        </TabsContent>

        <TabsContent value="preview">
          <EffectivePermissions />
        </TabsContent>
      </Tabs>
    </ManagementPage>
  );
}

function EffectivePermissions() {
  const [staffId, setStaffId] = useState<string>('');
  const staff = useQueryResource(qk('mgmt', 'staff', 'preview-list'), () => staffService.list({}, 1, 100), { staleTime: 60_000 });
  const perms = useQueryResource<string[]>(qk('mgmt', 'staff', staffId, 'effective'), () => staffService.effectivePermissions(staffId), { enabled: Boolean(staffId) });

  return (
    <div className="space-y-3">
      <p className="text-sm text-foreground-muted">The backend resolves effective permissions (roles + branch overrides + wildcards). This is read-only.</p>
      <select className={selectCls} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
        <option value="">Select a staff member…</option>
        {(staff.data?.items ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {staffId && (perms.isLoading ? <Spinner /> : (
        <div className="flex flex-wrap gap-1.5">
          {(perms.data ?? []).map((p) => <Badge key={p} tone="neutral" variant="soft">{p}</Badge>)}
          {(perms.data ?? []).length === 0 && <p className="text-sm text-foreground-subtle">No permissions.</p>}
        </div>
      ))}
    </div>
  );
}
