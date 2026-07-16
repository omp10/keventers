import { Card, Icon, type IconName } from '@/design-system';
import { NotificationsList } from '@/features/ordering';
import { useSoundSettings } from '../realtime';

/** Generic "module arrives in a later phase" placeholder. */
function ComingSoon({ title, icon, description }: { title: string; icon: IconName; description: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Icon name={icon} className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{description}</p>
        <span className="mt-3 inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground-muted">Coming in a later phase</span>
      </div>
    </div>
  );
}

export const KitchenPage = () => <ComingSoon title="Kitchen Display" icon="flame" description="The KDS screen (queue, stations, SLA) arrives in a later Restaurant phase." />;
export const CustomersPage = () => <ComingSoon title="Customers" icon="users" description="Customer CRM, loyalty, and history land in a later phase." />;
export const MenuPage = () => <ComingSoon title="Menu management" icon="utensils" description="Catalog, categories, products, and availability come next." />;
export const PaymentsPage = () => <ComingSoon title="Payments" icon="payment" description="Transactions, refunds, settlements, and payouts arrive later." />;
export const TablesPage = () => <ComingSoon title="Tables & QR" icon="grid" description="Floor plan, tables, and QR management come in a later phase." />;

/** Notifications inbox — reuses the platform Notification Center list. */
export const RestaurantNotificationsPage = () => (
  <div className="space-y-4">
    <h1 className="text-xl font-bold text-foreground">Notifications</h1>
    <NotificationsList />
  </div>
);

/** Settings — real settings that exist today (new-order sound). */
export function SettingsPage() {
  const sound = useSoundSettings();
  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>
      <Card padding="md" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">New-order sound</p>
            <p className="text-xs text-foreground-muted">Play a chime when a new order arrives.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center">
            <input type="checkbox" className="peer sr-only" checked={sound.enabled} onChange={(e) => sound.setEnabled(e.target.checked)} />
            <span className="h-6 w-11 rounded-full bg-input transition peer-checked:bg-primary" />
          </label>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="vol" className="text-sm text-foreground">Volume</label>
            <button type="button" onClick={sound.test} className="text-xs font-medium text-primary hover:underline">Test</button>
          </div>
          <input id="vol" type="range" min={0} max={1} step={0.1} value={sound.volume} onChange={(e) => sound.setVolume(Number(e.target.value))} className="w-full accent-[var(--kv-color-primary)]" />
        </div>
      </Card>
    </div>
  );
}
