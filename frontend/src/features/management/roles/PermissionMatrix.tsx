import { Fragment, useMemo } from 'react';

import { Checkbox, Icon, Spinner, toast } from '@/design-system';
import { qk, queryClient, useMutationResource, useQueryResource } from '@/platform/query';
import { cn } from '@/lib/cn';
import { roleService } from '../services';
import type { Permission, Role } from '../types';

/** Does a role grant a permission (honoring backend wildcard grants)? */
function grants(role: Role, perm: Permission): { on: boolean; wildcard: boolean } {
  if (role.permissions.includes('*') || role.permissions.includes(`${perm.resource}:*`)) return { on: true, wildcard: true };
  return { on: role.permissions.includes(perm.key), wildcard: false };
}

/**
 * PermissionMatrix — roles × permissions grid. Reflects the backend RBAC model
 * (including wildcard grants, shown checked + locked). Toggling a cell for a
 * non-system role updates that role's permission set on the backend. The frontend
 * NEVER resolves effective permissions itself — it only edits the grant list.
 */
export function PermissionMatrix() {
  const roles = useQueryResource<Role[]>(qk('mgmt', 'roles'), () => roleService.list());
  const perms = useQueryResource<Permission[]>(qk('mgmt', 'permissions'), () => roleService.permissions(), { staleTime: 300_000 });

  const update = useMutationResource<Role, { role: Role; key: string }>(
    ({ role, key }) => {
      const has = role.permissions.includes(key);
      const next = has ? role.permissions.filter((p) => p !== key) : [...role.permissions, key];
      return roleService.update(role.id, { permissions: next });
    },
    { onSuccess: () => { void queryClient.invalidateQueries({ queryKey: qk('mgmt', 'roles') }); }, onError: (e) => toast.error('Update failed', { description: (e as Error).message }) },
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of perms.data ?? []) {
      const arr = map.get(p.resource) ?? [];
      arr.push(p);
      map.set(p.resource, arr);
    }
    return [...map.entries()];
  }, [perms.data]);

  if (roles.isLoading || perms.isLoading) return <div className="grid h-40 place-items-center"><Spinner /></div>;
  const roleList = roles.data ?? [];

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-semibold text-foreground">Permission</th>
            {roleList.map((r) => (
              <th key={r.id} className="px-3 py-2 text-center font-semibold text-foreground">
                {r.name}
                {r.system && <span className="ml-1 text-xs font-normal text-foreground-subtle">(system)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grouped.map(([resource, plist]) => (
            <Fragment key={resource}>
              <tr className="bg-background">
                <td colSpan={roleList.length + 1} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground-subtle">{resource}</td>
              </tr>
              {plist.map((p) => (
                <tr key={p.key} className="border-b border-border last:border-0">
                  <td className="sticky left-0 z-10 bg-surface px-3 py-2 text-foreground">{p.action}{p.description ? <span className="ml-1 text-xs text-foreground-subtle">· {p.description}</span> : null}</td>
                  {roleList.map((r) => {
                    const g = grants(r, p);
                    const locked = g.wildcard || r.system;
                    return (
                      <td key={r.id} className="px-3 py-2 text-center">
                        {g.wildcard ? (
                          <Icon name="check" className="mx-auto h-4 w-4 text-success" aria-label="Granted via wildcard" />
                        ) : (
                          <Checkbox checked={g.on} disabled={locked || update.isPending} onCheckedChange={() => update.mutate({ role: r, key: p.key })} aria-label={`${r.name} ${p.key}`} className={cn(locked && 'opacity-50')} />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
