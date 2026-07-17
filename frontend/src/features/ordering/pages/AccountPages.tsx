import { useNavigate } from 'react-router-dom';

import { Button, Card, Icon } from '@/design-system';
import { useAuth } from '@/platform/auth';
import { LoyaltyPanel, NotificationsList, OrderHistory, ProfilePanel } from '../account';
import { OrderingHeader } from './OrderingHeader';

/**
 * The identity block at the top of /account. Guests get a sign-in invitation
 * (accounts are optional — ordering works without one); signed-in customers see
 * who they are and can sign out.
 */
function AccountIdentity() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <Card padding="lg" className="mb-6 space-y-3 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon name="user" className="h-6 w-6" />
        </span>
        <div>
          <h2 className="font-semibold text-foreground">You're browsing as a guest</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Sign in to keep your order history, favorites and rewards across visits.
          </p>
        </div>
        <Button fullWidth onClick={() => navigate('/login', { state: { from: '/account' } })}>
          Sign in with phone
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="md" className="mb-6 flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-lg font-bold text-primary">
        {(user?.firstName ?? 'U').charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{user?.fullName || user?.phone || 'Customer'}</p>
        <p className="truncate text-xs text-foreground-muted">{user?.phone ?? user?.email ?? ''}</p>
      </div>
      <Button variant="ghost" size="sm" leftIcon="logout" onClick={() => void logout()}>
        Sign out
      </Button>
    </Card>
  );
}

/** /account — customer profile, preferences, quick links. */
export function AccountPage() {
  return (
    <div>
      <OrderingHeader title="Account" />
      <AccountIdentity />
      <ProfilePanel />
    </div>
  );
}

/** /orders — order history. */
export function OrdersPage() {
  return (
    <div>
      <OrderingHeader title="Your orders" />
      <OrderHistory />
    </div>
  );
}

/** /loyalty — points, tier, rewards. */
export function LoyaltyPage() {
  return (
    <div>
      <OrderingHeader title="Rewards" />
      <LoyaltyPanel />
    </div>
  );
}

/** /notifications — the notifications inbox. */
export function NotificationsPage() {
  return (
    <div>
      <OrderingHeader title="Notifications" />
      <NotificationsList />
    </div>
  );
}
