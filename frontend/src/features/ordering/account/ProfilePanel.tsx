import { Link } from 'react-router-dom';

import { Avatar, Badge, Button, Icon, Switch, type IconName } from '@/design-system';
import { useSession } from '../hooks';
import { useNotificationPreferences, useProfile } from '../hooks';

function LinkRow({ to, icon, label }: { to: string; icon: IconName; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 transition hover:border-border-strong">
      <Icon name={icon} className="h-5 w-5 text-primary" />
      <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
      <Icon name="chevronRight" className="h-4 w-4 text-foreground-subtle" />
    </Link>
  );
}

/**
 * ProfilePanel — the customer profile (guest or linked). Shows identity, quick
 * links (orders, favorites, loyalty), and notification preferences. Favorites reuse
 * the Discovery Platform; notification prefs go through the profile service.
 */
export function ProfilePanel() {
  const { profile, isGuest } = useProfile();
  const { preferences, update: updatePrefs } = useNotificationPreferences();
  const session = useSession();

  const setPref = (key: 'order' | 'payment' | 'promotions', value: boolean) => updatePrefs({ ...preferences, [key]: value });

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="flex items-center gap-3">
        <Avatar alt={profile?.name ?? 'Guest'} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-foreground">{profile?.name ?? 'Guest'}</p>
          <p className="truncate text-sm text-foreground-muted">{profile?.phone ?? profile?.email ?? 'Browsing as guest'}</p>
        </div>
        {isGuest && <Badge tone="neutral" variant="soft">Guest</Badge>}
      </div>

      {/* Quick links */}
      <div className="space-y-2">
        <LinkRow to="/orders" icon="order" label="Order history" />
        <LinkRow to="/favorites" icon="star" label="Favorites" />
        <LinkRow to="/loyalty" icon="gift" label="Rewards & points" />
      </div>

      {/* Notification preferences */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-subtle">Notifications</h2>
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {([
            ['order', 'Order updates'],
            ['payment', 'Payment updates'],
            ['promotions', 'Offers & promotions'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between p-3.5">
              <span className="text-sm text-foreground">{label}</span>
              <Switch checked={preferences?.[key] ?? true} onCheckedChange={(v) => setPref(key, Boolean(v))} />
            </label>
          ))}
        </div>
      </section>

      {isGuest && (
        <Button variant="ghost" fullWidth onClick={session.end}>
          End guest session
        </Button>
      )}
    </div>
  );
}
