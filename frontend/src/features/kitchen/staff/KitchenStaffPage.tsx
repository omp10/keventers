import { useMemo, useState } from 'react';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Field,
  Icon,
  Input,
  Skeleton,
  StatCard,
  toast,
} from '@/design-system';
import { qk, queryClient, useQueryResource } from '@/platform/query';
import { cn } from '@/lib/cn';

import { useChefs } from '../hooks';
import { kitchenStaffService, type StaffMember, ASSIGNABLE_ROLES, type AssignableRole } from './staff.service';

const KEY = qk('kitchen', 'staff');

const ROLE_LABELS: Record<string, string> = {
  organization_admin: 'Organization admin',
  restaurant_manager: 'Restaurant manager',
  branch_manager: 'Branch manager',
  kitchen_manager: 'Kitchen manager',
  cashier: 'Cashier',
  waiter: 'Waiter',
  staff: 'Staff',
};
const roleLabel = (r: string) => ROLE_LABELS[r] ?? r.replace(/_/g, ' ');

/**
 * KitchenStaffPage — the roster, from the kitchen's own app.
 *
 * Two things were previously impossible from here: seeing who works this
 * kitchen, and adding anyone. Both are memberships under the hood, which is
 * also exactly what the board's assign picker draws from — so the "Working now"
 * counts here and the workload in the assign dialog are the same numbers, not a
 * second source that can disagree.
 */
export function KitchenStaffPage() {
  const staff = useQueryResource<StaffMember[]>(KEY, () => kitchenStaffService.list());
  const chefs = useChefs();
  const [inviting, setInviting] = useState(false);

  // Live workload comes from the roster the board already uses.
  const activeByUser = useMemo(
    () => new Map((chefs.data ?? []).map((c) => [c.id, c.activeCount ?? 0])),
    [chefs.data],
  );

  const members = staff.data ?? [];
  const onTheLine = members.filter((m) => !m.isOwner);
  const busy = onTheLine.filter((m) => (activeByUser.get(m.userId) ?? 0) > 0).length;

  if (staff.isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-foreground">Staff</h1>
        <Button leftIcon="add" onClick={() => setInviting(true)}>
          Add staff
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="On the roster" value={onTheLine.length} icon="users" hint="Can be assigned orders" />
        <StatCard label="Working now" value={busy} icon="flame" hint="Holding at least one ticket" />
        <StatCard
          label="Managers"
          value={members.filter((m) => m.isOwner || m.role.includes('manager') || m.role.includes('admin')).length}
          icon="shield"
          hint="Own or manage this kitchen"
        />
      </div>

      {staff.isError ? (
        <EmptyState
          icon={<Icon name="warning" className="mb-3 h-8 w-8 text-danger" />}
          title="Couldn't load the roster"
          description={staff.error?.message ?? 'Please try again.'}
          action={<Button onClick={() => void staff.refetch()}>Retry</Button>}
        />
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Icon name="users" className="mb-3 h-8 w-8 text-foreground-subtle" />}
          title="Nobody on the roster yet"
          description="Add your first team member — you can then assign orders to them from the board, and they'll see their tickets on their own phone."
          action={
            <Button leftIcon="add" onClick={() => setInviting(true)}>
              Add staff
            </Button>
          }
        />
      ) : (
        <Card padding="none" className="divide-y divide-border">
          {members.map((m) => {
            const active = activeByUser.get(m.userId) ?? 0;
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-3 p-3.5">
                <Avatar src={m.avatarUrl ?? undefined} alt={m.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <strong className="truncate text-sm text-foreground">{m.name}</strong>
                    {m.isOwner && <Badge tone="accent" variant="soft">Owner</Badge>}
                  </div>
                  <p className="truncate text-xs text-foreground-muted">{m.email ?? m.phone ?? '—'}</p>
                </div>
                <Badge tone="neutral" variant="soft">{roleLabel(m.role)}</Badge>
                <span
                  className={cn(
                    'rounded-lg px-2 py-1 text-xs font-semibold tabular-nums',
                    active > 0 ? 'bg-warning-soft text-warning' : 'text-foreground-subtle',
                  )}
                >
                  {active > 0 ? `${active} active` : 'Free'}
                </span>
              </div>
            );
          })}
        </Card>
      )}

      <p className="flex items-start gap-2 text-xs text-foreground-subtle">
        <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Anyone here can be assigned an order from the board. They sign in to the staff app with their phone number and
        see only their own tickets.
      </p>

      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [role, setRole] = useState<AssignableRole>('staff');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!email.trim()) return toast.error('An email is required to invite someone.');
    // Floor staff sign in by phone OTP. Inviting one without a number creates
    // an account that can never open the app the invite was for.
    if (!phone.trim() && role === 'staff') {
      return toast.error('A phone number is required for staff', {
        description: "They sign in to the staff app with it — without one they can't see their orders.",
      });
    }
    setSaving(true);
    try {
      await kitchenStaffService.invite({
        email: email.trim(),
        phone: phone.trim() || undefined,
        firstName: firstName.trim() || undefined,
        role,
      });
      toast.success(`${firstName || email} added`, { description: 'They can sign in to the staff app with their phone.' });
      await queryClient.invalidateQueries({ queryKey: KEY });
      setEmail('');
      setPhone('');
      setFirstName('');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add this person');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add staff</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Email" required description="They'll get a link to set a password.">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ravi@yourrestaurant.com" />
          </Field>
          <Field
            label="Phone"
            required={role === 'staff'}
            description="How they sign in to the staff app to pick up orders."
          >
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+919800000201" />
          </Field>
          <Field label="Name">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ravi" />
          </Field>
          <Field label="Role" description="What they can do. Staff work the line and take assigned orders.">
            <div className="grid gap-1.5 sm:grid-cols-2">
              {ASSIGNABLE_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    role === r ? 'border-primary bg-primary-soft text-primary' : 'border-border hover:border-primary/40',
                  )}
                >
                  {roleLabel(r)}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={() => void submit()}>Add to roster</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
