import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge, Button, Icon, Input, Switch, ThemeToggleButton, toast, type IconName } from '@/design-system';
import { useAuth } from '@/platform/auth';
import { cn } from '@/lib/cn';
import { useCustomerPreferences, useLoyalty, useProfile } from '../hooks';

/** Money in the backend's customer stats is in MINOR units (paise). */
function formatMinor(minor: number, currency = 'INR') {
  const symbol = currency === 'INR' ? '₹' : `${currency} `;
  const major = minor / 100;
  return `${symbol}${major.toLocaleString(undefined, { maximumFractionDigits: major < 100 ? 2 : 0 })}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-subtle">{title}</h2>
      {children}
    </section>
  );
}

function LinkRow({ to, icon, label }: { to: string; icon: IconName; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3.5 transition hover:bg-muted/50">
      <Icon name={icon} className="h-5 w-5 shrink-0 text-primary" />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-foreground-subtle" />
    </Link>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 p-3.5">
      <span className="min-w-0">
        <span className="block text-sm text-foreground">{label}</span>
        {hint && <span className="block text-xs text-foreground-subtle">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
    </label>
  );
}

/**
 * The identity header — who you are, and the one thing here that's yours to fix.
 * Sourced from the ACCOUNT, not the restaurant's customer record: it's the same on
 * day one, before you've ordered anything and have a record at all.
 */
function Identity() {
  const { user, updateName } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const displayName = user?.fullName?.trim() || null;
  const initial = (displayName ?? user?.phone ?? '?').replace(/^\+/, '').charAt(0).toUpperCase();

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const [firstName, ...rest] = trimmed.split(/\s+/);
      await updateName({ firstName, lastName: rest.join(' ') || undefined });
      setEditing(false);
      toast.success('Name updated');
    } catch (error) {
      toast.error('Could not update name', { description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <form onSubmit={save} className="rounded-xl border border-border bg-surface p-4">
        <label className="block text-sm font-medium text-foreground">
          Your name
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aisha Khan" maxLength={80} className="mt-1.5" />
        </label>
        <div className="mt-3 flex gap-2">
          <Button type="submit" size="sm" loading={busy} disabled={!name.trim()}>Save</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-border bg-surface p-4">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary-soft text-xl font-bold text-primary">
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        {displayName ? (
          <p className="truncate text-lg font-bold text-foreground">{displayName}</p>
        ) : (
          // Never invent a name. An unnamed account says so, and offers the fix.
          <p className="truncate text-lg font-bold text-foreground-muted">Add your name</p>
        )}
        <p className="truncate text-sm text-foreground-muted">{user?.phone ?? user?.email ?? ''}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        leftIcon="edit"
        aria-label="Edit your name"
        onClick={() => {
          setName(displayName ?? '');
          setEditing(true);
        }}
      >
        Edit
      </Button>
    </div>
  );
}

/** Points + tier, with rewards one tap away. */
function LoyaltyCard() {
  const { account } = useLoyalty();
  if (!account) return null;
  return (
    <Link
      to="/loyalty"
      className="flex items-center gap-4 rounded-xl border border-border bg-gradient-to-br from-primary-soft to-surface p-4 transition hover:border-primary/40"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        <Icon name="gift" className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold leading-none text-foreground">
          {(account.balance ?? 0).toLocaleString()}
          <span className="ml-1.5 text-sm font-medium text-foreground-muted">points</span>
        </p>
        <p className="mt-1 text-xs text-foreground-muted">Tap to spend on rewards</p>
      </div>
      {account.tier && <Badge tone="neutral" variant="soft" className="shrink-0 capitalize">{account.tier}</Badge>}
    </Link>
  );
}

/** Ordering history at a glance — hidden until there IS a history. */
function Stats() {
  const { profile } = useProfile();
  const stats = profile?.stats;
  if (!stats?.totalOrders) return null;
  const cells = [
    { label: 'Orders', value: String(stats.totalOrders) },
    { label: 'Spent', value: formatMinor(stats.lifetimeSpend) },
    { label: 'Visits', value: String(stats.visitCount) },
  ];
  return (
    <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-surface">
      {cells.map((c) => (
        <div key={c.label} className="p-3 text-center">
          <p className="text-lg font-bold text-foreground">{c.value}</p>
          <p className="text-xs text-foreground-subtle">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

/** Mirrors the backend's DIETARY_PREFERENCE enum. */
const DIETARY = [
  { key: 'veg', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'eggless', label: 'Eggless' },
  { key: 'jain', label: 'Jain' },
];

/**
 * Dietary choices + notification toggles. Both come from the same preferences
 * record, so they live or die together — and each owns its own heading, because
 * a heading with nothing underneath it reads as broken, not as empty.
 *
 * Preferences only exist once someone has a customer record (i.e. has ordered),
 * so a brand-new account renders neither rather than a pair of bare headings.
 */
function Preferences() {
  const { preferences, update } = useCustomerPreferences();
  if (!preferences) return null;

  const selected = new Set(preferences.dietary);
  const toggleDiet = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    void update({ dietary: [...next] }).catch((e: Error) => toast.error('Could not save', { description: e.message }));
  };
  const setNotify = (key: 'orderUpdates' | 'promotions' | 'loyalty', value: boolean) =>
    void update({ notifications: { ...preferences.notifications, [key]: value } }).catch((e: Error) =>
      toast.error('Could not save', { description: e.message }),
    );

  return (
    <>
      <Section title="Food preferences">
        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-surface p-3.5">
          {DIETARY.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => toggleDiet(d.key)}
              aria-pressed={selected.has(d.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                selected.has(d.key)
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground-muted hover:border-border-strong hover:text-foreground',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Notify me about">
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          <ToggleRow label="Order updates" hint="When your food is being made and ready" checked={preferences.notifications.orderUpdates} onChange={(v) => setNotify('orderUpdates', v)} />
          <ToggleRow label="Rewards" hint="Points earned and rewards you can claim" checked={preferences.notifications.loyalty} onChange={(v) => setNotify('loyalty', v)} />
          <ToggleRow label="Offers" hint="Occasional deals" checked={preferences.notifications.promotions} onChange={(v) => setNotify('promotions', v)} />
        </div>
      </Section>
    </>
  );
}

/**
 * ProfilePanel — the signed-in customer's home: who they are, what they've earned,
 * where their orders live, and the few things that are genuinely theirs to set
 * (name, how they eat, what we may notify them about).
 *
 * Deliberately NOT here: saved addresses and payment methods. This is dine-in QR
 * ordering — you pay at the table you're sitting at — so both would be furniture
 * borrowed from a delivery app, collecting data no flow ever reads. (The API can
 * store addresses; when delivery ships, that's the moment to surface them.)
 *
 * Sections self-hide when their data doesn't exist yet, so a new account sees a
 * short honest page rather than a wall of zeroes.
 */
export function ProfilePanel() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <Identity />
      <LoyaltyCard />
      <Stats />

      <Section title="Activity">
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          <LinkRow to="/orders" icon="order" label="Your orders" />
          <LinkRow to="/favorites" icon="star" label="Saved places" />
          <LinkRow to="/loyalty" icon="gift" label="Rewards" />
          <LinkRow to="/notifications" icon="bell" label="Notifications" />
        </div>
      </Section>

      <Preferences />

      <Section title="Appearance">
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3.5">
          <span className="text-sm text-foreground">Theme</span>
          <ThemeToggleButton />
        </div>
      </Section>

      <Button
        variant="ghost"
        fullWidth
        leftIcon="logout"
        onClick={async () => {
          await logout();
          navigate('/');
        }}
      >
        Sign out
      </Button>
    </div>
  );
}
