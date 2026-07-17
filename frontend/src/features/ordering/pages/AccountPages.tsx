import { useNavigate } from 'react-router-dom';

import { Button, Card, Icon } from '@/design-system';
import { useAuth } from '@/platform/auth';
import { LoyaltyPanel, NotificationsList, OrderHistory, ProfilePanel } from '../account';
import { OrderingHeader } from './OrderingHeader';

/**
 * What a guest sees at /account. Accounts are OPTIONAL — ordering works fully
 * without one — so this invites rather than blocks, and never pretends there's a
 * profile behind it.
 */
function SignedOut() {
  const navigate = useNavigate();
  return (
    <Card padding="lg" className="space-y-3 text-center">
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

/**
 * /account — the customer's profile.
 *
 * The identity block lives in ProfilePanel and nowhere else: this page used to
 * render its own on top of it, so a signed-in customer met their own name, avatar
 * and phone number twice in one screen.
 */
export function AccountPage() {
  const { isAuthenticated } = useAuth();
  return (
    <div>
      <OrderingHeader title="Account" />
      {isAuthenticated ? <ProfilePanel /> : <SignedOut />}
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
