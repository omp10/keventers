/**
 * LAYOUT SYSTEM — six shells, all composed from the SAME shared primitives
 * (Sidebar, Topbar, AppShell), so every surface inherits identical chrome,
 * spacing and behavior. Pick a layout, pass nav + content.
 */
export { AppShell, type AppShellProps } from './AppShell';
export { RestaurantLayout, AdminLayout } from './DashboardLayouts';
export { CustomerLayout, type CustomerLayoutProps } from './CustomerLayout';
export { KitchenLayout, type KitchenLayoutProps } from './KitchenLayout';
export { AuthLayout, type AuthLayoutProps } from './AuthLayout';
export { MinimalLayout, type MinimalLayoutProps } from './MinimalLayout';

export { Sidebar, type SidebarProps } from './components/Sidebar';
export { Topbar, type TopbarProps } from './components/Topbar';
export type { NavItem, NavSection, RenderLink } from './types';
export { defaultRenderLink } from './types';
