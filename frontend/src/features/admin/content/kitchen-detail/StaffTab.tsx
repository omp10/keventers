import { Avatar, Badge, Card, EmptyState, Icon, Skeleton, StatCard } from '@/design-system';
import { StatusPill } from '@/features/management/components';
import { qk, useQueryResource } from '@/platform/query';

import { adminService } from '../../admin.service';
import type { AdminKitchen, KitchenStaff, KitchenStaffResponse } from '../../types';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super admin',
  organization_admin: 'Organization admin',
  restaurant_manager: 'Restaurant manager',
  branch_manager: 'Branch manager',
  staff: 'Staff',
};

const roleLabel = (role: string) => ROLE_LABELS[role] ?? role.replace(/_/g, ' ');

/**
 * StaffTab — who runs this outlet.
 *
 * Staff are memberships rather than a separate roster, so this list spans two
 * groups: people ROSTERED HERE (a branch-scoped membership) and people who
 * inherit the outlet from above (brand managers, org owners). Mixing them under
 * one number would overstate the headcount at the kitchen, so they're counted
 * and listed separately.
 */
export function StaffTab({ kitchen: k }: { kitchen: AdminKitchen }) {
  const staff = useQueryResource<KitchenStaffResponse>(qk('admin', 'kitchen-staff', k.id), () =>
    adminService.kitchenStaff(k.id),
  );

  if (staff.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const items = staff.data?.items ?? [];
  const counts = staff.data?.counts;

  if (!items.length) {
    return (
      <EmptyState
        title="Nobody is assigned to this outlet"
        description="Staff get access through memberships. Until someone is added, no one can operate this kitchen."
        icon={<Icon name="users" className="mb-4 h-10 w-10 text-foreground-subtle" />}
      />
    );
  }

  const rostered = items.filter((s) => s.atThisKitchen);
  const inherited = items.filter((s) => !s.atThisKitchen);
  const byRole = Object.entries(counts?.byRole ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="At this kitchen" value={counts?.atThisKitchen ?? 0} icon="users" hint="Rostered to this outlet" />
        <StatCard label="With access" value={counts?.total ?? 0} icon="shield" hint="Including brand & org managers" />
        <StatCard
          label="Roles"
          value={byRole.length}
          icon="grid"
          hint={byRole.map(([r, n]) => `${n} ${roleLabel(r).toLowerCase()}`).join(' · ') || undefined}
        />
      </div>

      <Card padding="md" className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="users" className="h-4 w-4 text-foreground-subtle" />
          <p className="text-sm font-medium text-foreground">Rostered at this kitchen</p>
          <span className="text-xs text-foreground-subtle">{rostered.length}</span>
        </div>
        {rostered.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            Nobody is rostered to this outlet specifically — it's covered only by the managers below.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rostered.map((s) => (
              <StaffRow key={s.id} staff={s} />
            ))}
          </ul>
        )}
      </Card>

      {inherited.length > 0 && (
        <Card padding="md" className="space-y-3">
          <div className="flex items-center gap-2">
            <Icon name="shield" className="h-4 w-4 text-foreground-subtle" />
            <p className="text-sm font-medium text-foreground">Also has access</p>
            <span className="text-xs text-foreground-subtle">{inherited.length}</span>
          </div>
          <p className="text-xs text-foreground-muted">
            These people manage {k.restaurant?.name ?? 'the brand'} or its organization, so they reach this outlet without
            being rostered here.
          </p>
          <ul className="divide-y divide-border">
            {inherited.map((s) => (
              <StaffRow key={s.id} staff={s} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StaffRow({ staff: s }: { staff: KitchenStaff }) {
  const inactive = s.status !== 'active' || (s.userStatus && s.userStatus !== 'active');
  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
      <Avatar src={s.avatarUrl ?? undefined} alt={s.name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <strong className="truncate text-sm text-foreground">{s.name}</strong>
          {s.isOwner && <Badge tone="accent" variant="soft">Owner</Badge>}
        </div>
        <p className="truncate text-xs text-foreground-muted">
          {[s.email, s.phone].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone="neutral" variant="soft">{roleLabel(s.role)}</Badge>
        {inactive ? (
          <StatusPill tone="neutral">{s.userStatus !== 'active' ? (s.userStatus ?? 'inactive') : s.status}</StatusPill>
        ) : (
          <StatusPill tone="success">active</StatusPill>
        )}
      </div>
      <p className="w-full text-xs text-foreground-subtle sm:w-auto sm:text-right">
        {s.lastLoginAt ? `Last seen ${new Date(s.lastLoginAt).toLocaleDateString()}` : 'Never signed in'}
      </p>
    </li>
  );
}
