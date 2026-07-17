import { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Logo } from '@/assets';
import { Badge, Spinner, ThemeToggleButton } from '@/design-system';
import { NotificationCenter } from '@/platform/notifications';
import { CustomerLayout } from '@/layouts';
import type { NavItem } from '@/layouts';

/** The staff app's five thumb-reach tabs. Orders is the raised primary action. */
const TABS = [
  { key: 'home', label: 'Home', icon: 'home', href: '/staff' },
  { key: 'orders', label: 'Orders', icon: 'order', href: '/staff/orders', emphasized: true },
  { key: 'history', label: 'History', icon: 'clock', href: '/staff/history' },
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
      <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner /></div>}>
        <Outlet />
      </Suspense>
    </CustomerLayout>
  );
}
