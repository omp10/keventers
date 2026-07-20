import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Logo } from '@/assets';
import { Badge, Icon, Spinner, ThemeToggleButton } from '@/design-system';
import { NotificationCenter } from '@/platform/notifications';
import { CustomerLayout } from '@/layouts';
import type { NavItem } from '@/layouts';
import { isAudioLocked, onAudioLockChange, playOrderAlert } from '@/utils/order-alert';
import { useStaffRealtime } from './hooks';

/** The staff app's five thumb-reach tabs. Orders is the raised primary action. */
const TABS = [
  { key: 'home', label: 'Home', icon: 'home', href: '/staff' },
  { key: 'history', label: 'History', icon: 'clock', href: '/staff/history' },
  // Orders sits DEAD CENTRE of the five: it is the raised primary action and the
  // one a waiter reaches for mid-service, so it belongs under the thumb rather
  // than off to one side.
  { key: 'orders', label: 'Orders', icon: 'order', href: '/staff/orders', emphasized: true },
  { key: 'alerts', label: 'Alerts', icon: 'bell', href: '/staff/notifications' },
  { key: 'profile', label: 'Profile', icon: 'user', href: '/staff/profile' },
] satisfies NavItem[];

/**
 * StaffShell — the floor-staff phone app's chrome. Deliberately REUSES the
 * CustomerLayout shell (same bottom-tab ergonomics, theming, safe areas,
 * auto-hide-on-scroll) rather than duplicating a mobile layout; only the tabs,
 * header badge and routes differ.
 */
export function StaffShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Mounted here so an assignment rings on EVERY tab, not just the queue pages.
  useStaffRealtime();

  // A phone that silently lost autoplay permission looks identical to a quiet
  // shift. Say so, and make the fix one tap.
  const [soundBlocked, setSoundBlocked] = useState(isAudioLocked);
  useEffect(() => onAudioLockChange(setSoundBlocked), []);

  const tabs = TABS.map((t) => ({
    ...t,
    active: t.href === '/staff' ? pathname === '/staff' : pathname.startsWith(t.href),
  }));

  return (
    <CustomerLayout
      tabs={tabs}
      header={
        <span className="flex items-center gap-2">
          <Logo size={26} />
          <Badge tone="info" variant="soft" className="uppercase tracking-wide">Staff</Badge>
        </span>
      }
      headerActions={
        <>
          <NotificationCenter />
          <ThemeToggleButton />
        </>
      }
      renderLink={(item, children, className) => (
        <button type="button" className={className} onClick={() => item.href && navigate(item.href)}>
          {children}
        </button>
      )}
    >
      {soundBlocked && (
        <button
          type="button"
          onClick={() => void playOrderAlert(1)}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-md bg-warning px-3 py-2 text-sm font-semibold text-warning-foreground"
        >
          <Icon name="warning" className="h-4 w-4" />
          Sound is blocked — tap once to enable new-order alerts
        </button>
      )}
      <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
        <Outlet />
      </Suspense>
    </CustomerLayout>
  );
}
