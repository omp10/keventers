import { useState, type ComponentType } from 'react';

import { Card, Icon, Spinner } from '@/design-system';
import { qk, useQueryResource } from '@/platform/query';
import { RestaurantScopeProvider } from '@/features/restaurant';
import { adminService } from './admin.service';

/**
 * ADMIN RESTAURANT-SCOPED WRAPPER — lets a super-admin drive the restaurant
 * management pages (subscriptions, journeys, feedback, upsell) for ANY outlet.
 *
 * The restaurant dashboard resolves its tenant from the signed-in manager, so
 * those pages send no restaurant id. A super-admin has no single restaurant, so
 * we add a picker here and thread the choice through RestaurantScopeProvider —
 * the exact same page component then acts on the selected outlet. One
 * implementation, two surfaces.
 */
export function AdminRestaurantScoped({ title, description, Page }: { title: string; description: string; Page: ComponentType }) {
  const [restaurantId, setRestaurantId] = useState<string>('');

  const restaurants = useQueryResource(qk('admin', 'scoped-restaurants'), () => adminService.kitchenRestaurants());
  const options = restaurants.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-foreground-muted">{description}</p>
        </div>
        <label className="text-xs font-medium text-foreground-muted">
          Restaurant
          <select
            value={restaurantId}
            onChange={(e) => setRestaurantId(e.target.value)}
            className="mt-1 block h-10 min-w-56 rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-primary"
          >
            <option value="">Choose a restaurant…</option>
            {options.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </label>
      </div>

      {restaurants.isLoading ? (
        <div className="grid min-h-40 place-items-center"><Spinner /></div>
      ) : !restaurantId ? (
        <Card padding="lg" className="text-center">
          <Icon name="store" className="mx-auto h-8 w-8 text-foreground-subtle" />
          <p className="mt-2 text-sm text-foreground-muted">Pick a restaurant above to manage it.</p>
        </Card>
      ) : (
        // key forces a fresh mount per restaurant so page state never leaks across outlets.
        <RestaurantScopeProvider key={restaurantId} restaurantId={restaurantId}>
          <Page />
        </RestaurantScopeProvider>
      )}
    </div>
  );
}
