import { LoyaltyPanel, NotificationsList, OrderHistory, ProfilePanel } from '../account';
import { OrderingHeader } from './OrderingHeader';

/** /account — customer profile, preferences, quick links. */
export function AccountPage() {
  return (
    <div>
      <OrderingHeader title="Account" />
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
