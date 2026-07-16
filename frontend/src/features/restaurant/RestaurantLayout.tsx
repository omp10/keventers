import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { AppShell } from '@/shell';
import { Icon, Spinner } from '@/design-system';
import { cn } from '@/lib/cn';
import { useDashboardIntegrations, useOrderDrawer } from './hooks';
import { useRestaurantRealtime, useSoundSettings } from './realtime';
import { OrderDetailDrawer } from './orders';
import { useManagementIntegrations } from '@/features/management';

/** Quick action: toggle the new-order sound alert. */
function SoundToggle() {
  const { enabled, setEnabled } = useSoundSettings();
  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? 'Mute new-order sound' : 'Unmute new-order sound'}
      onClick={() => setEnabled(!enabled)}
      className={cn('grid h-9 w-9 place-items-center rounded-md hover:bg-muted', enabled ? 'text-primary' : 'text-foreground-subtle')}
    >
      <Icon name={enabled ? 'bell' : 'bell'} className={cn('h-5 w-5', !enabled && 'opacity-50')} />
    </button>
  );
}

/**
 * RestaurantLayout — the staff dashboard shell. Reuses the F2 management AppShell
 * (config-driven sidebar + command palette + notification center + breadcrumbs +
 * env banner + connection status). Mounts the ONE realtime engine and registers
 * command/search integrations. The order detail drawer is global (URL-driven), so
 * it opens over any page.
 */
export function RestaurantLayout() {
  useRestaurantRealtime();
  useDashboardIntegrations();
  useManagementIntegrations();
  const { orderId, close } = useOrderDrawer();

  return (
    <AppShell app="restaurant" quickActions={<SoundToggle />} contentWidth="wide">
      <Suspense
        fallback={
          <div className="grid min-h-[60vh] place-items-center">
            <Spinner />
          </div>
        }
      >
        <Outlet />
      </Suspense>
      <OrderDetailDrawer orderId={orderId} onClose={close} />
    </AppShell>
  );
}
