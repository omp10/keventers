import type { AppShellProps } from './AppShell';
import { AppShell } from './AppShell';

/**
 * RestaurantLayout & AdminLayout — semantic wrappers over the shared AppShell.
 * They differ only in the `sections` (nav) an app passes; the chrome, spacing,
 * behavior and theming are identical, guaranteeing the Restaurant Dashboard and
 * Admin Dashboard feel like one product.
 */
export function RestaurantLayout(props: AppShellProps) {
  return <div data-app="restaurant" className="contents"><AppShell {...props} /></div>;
}

export function AdminLayout(props: AppShellProps) {
  return <div data-app="admin" className="contents"><AppShell {...props} /></div>;
}
