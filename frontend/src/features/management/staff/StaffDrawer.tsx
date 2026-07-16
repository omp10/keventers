import { useEffect, useState } from 'react';

import { Button, Input, Checkbox, toast } from '@/design-system';
import { qk, queryClient, useMutationResource, useQueryResource } from '@/platform/query';
import { EntityDrawer } from '../components';
import { branchService, roleService, staffService } from '../services';
import type { Role, Staff } from '../types';

const selectCls = 'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary';

/** Invite a new staff member or edit an existing one (Identity + Organization). */
export function StaffDrawer({ staffId, isNew, onClose }: { staffId?: string; isNew?: boolean; onClose: () => void }) {
  const roles = useQueryResource<Role[]>(qk('mgmt', 'roles'), () => roleService.list(), { staleTime: 60_000 });
  const branches = useQueryResource(qk('mgmt', 'branches'), () => branchService.list(), { staleTime: 60_000 });
  const existing = useQueryResource<Staff>(qk('mgmt', 'staff', staffId ?? null), () => staffService.get(staffId!), { enabled: Boolean(staffId && !isNew) });

  const [draft, setDraft] = useState<Partial<Staff>>({ branchIds: [] });
  useEffect(() => {
    if (existing.data) setDraft(existing.data);
  }, [existing.data]);

  const save = useMutationResource<Staff, void>(
    async () => {
      if (isNew) return staffService.invite({ email: draft.email ?? '', name: draft.name, role: draft.role ?? '', branchIds: draft.branchIds, department: draft.department });
      return staffService.update(staffId!, draft);
    },
    { invalidate: [qk('mgmt', 'staff-list')], onSuccess: () => { toast.success(isNew ? 'Invitation sent' : 'Saved'); void queryClient.invalidateQueries({ queryKey: qk('mgmt', 'staff') }); onClose(); } },
  );

  const toggleBranch = (id: string) => setDraft((d) => {
    const set = new Set(d.branchIds ?? []);
    set.has(id) ? set.delete(id) : set.add(id);
    return { ...d, branchIds: [...set] };
  });

  return (
    <EntityDrawer
      open
      onClose={onClose}
      title={isNew ? 'Invite staff' : 'Edit staff'}
      footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={() => save.mutate()}>{isNew ? 'Send invite' : 'Save'}</Button></div>}
    >
      <Field label="Full name"><Input value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Jane Cooper" /></Field>
      <Field label="Email"><Input type="email" value={draft.email ?? ''} onChange={(e) => setDraft({ ...draft, email: e.target.value })} disabled={!isNew} placeholder="jane@restaurant.com" /></Field>
      <Field label="Phone"><Input value={draft.phone ?? ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
      <Field label="Role">
        <select className={selectCls} value={draft.role ?? ''} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
          <option value="">Select a role</option>
          {(roles.data ?? []).map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </Field>
      <Field label="Department"><Input value={draft.department ?? ''} onChange={(e) => setDraft({ ...draft, department: e.target.value })} placeholder="Kitchen, Front of house…" /></Field>
      <Field label="Branch access">
        <div className="space-y-1.5">
          {(branches.data ?? []).map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={draft.branchIds?.includes(b.id) ?? false} onCheckedChange={() => toggleBranch(b.id)} />
              {b.name}
            </label>
          ))}
          {(branches.data ?? []).length === 0 && <p className="text-sm text-foreground-subtle">No branches.</p>}
        </div>
      </Field>
    </EntityDrawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
