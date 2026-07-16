import type { NavConfig } from './types';

/**
 * NAVIGATION CONFIGS — the ONLY place menus are defined. Changing navigation =
 * editing this file, never a component. Paths are placeholders the consuming apps
 * own; `access` rules gate visibility via the permission platform. (These are
 * infrastructure examples — the platform ships the mechanism + shape, apps refine
 * the exact items.)
 */

export const customerNav: NavConfig = {
  app: 'customer',
  groups: [],
  tabs: [
    { key: 'home', label: 'Home', icon: 'home', path: '/' },
    { key: 'discover', label: 'Discover', icon: 'search', path: '/discover', access: { requireFlags: ['discovery'] } },
    { key: 'orders', label: 'Orders', icon: 'order', path: '/orders' },
    { key: 'rewards', label: 'Rewards', icon: 'gift', path: '/rewards', access: { requireFlags: ['loyalty'] } },
    { key: 'profile', label: 'Profile', icon: 'user', path: '/profile' },
  ],
};

export const restaurantNav: NavConfig = {
  app: 'restaurant',
  // The staff dashboard is namespaced under /dashboard so it coexists with the
  // customer app in one router. Changing nav = editing this config, never a component.
  groups: [
    {
      items: [
        { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/dashboard', access: { anyPermission: ['analytics:read', 'order:read'] } },
        { key: 'orders', label: 'Orders', icon: 'order', path: '/dashboard/orders', access: { anyPermission: ['order:read', 'order:manage'] } },
        { key: 'kitchen', label: 'Kitchen', icon: 'flame', path: '/kitchen', access: { anyPermission: ['kitchen:read'], requireFlags: ['kitchen'] } },
        { key: 'analytics', label: 'Analytics', icon: 'trend', path: '/dashboard/analytics', access: { anyPermission: ['analytics:read'], requireFlags: ['analytics'] } },
      ],
    },
    {
      title: 'Catalog',
      items: [
        { key: 'menu', label: 'Menus', icon: 'menu', path: '/dashboard/menu', access: { anyPermission: ['menu:read', 'product:read', 'catalog:read'] } },
        { key: 'categories', label: 'Categories', icon: 'grid', path: '/dashboard/catalog/categories', access: { anyPermission: ['menu:read', 'category:read', 'catalog:read'] } },
        { key: 'products', label: 'Products', icon: 'utensils', path: '/dashboard/catalog/products', access: { anyPermission: ['product:read', 'menu:read', 'catalog:read'] } },
        { key: 'variants', label: 'Variants', icon: 'package', path: '/dashboard/catalog/variants', access: { anyPermission: ['product:read', 'variant:read', 'catalog:read'] } },
        { key: 'modifiers', label: 'Modifier groups', icon: 'more', path: '/dashboard/catalog/modifiers', access: { anyPermission: ['product:read', 'menu:read', 'catalog:read'] } },
        { key: 'addons', label: 'Add-ons', icon: 'add', path: '/dashboard/catalog/addons', access: { anyPermission: ['product:read', 'addon:read', 'catalog:read'] } },
        { key: 'preview', label: 'Live preview', icon: 'eye', path: '/dashboard/catalog/preview', access: { anyPermission: ['menu:read', 'product:read', 'catalog:read'] } },
      ],
    },
    {
      title: 'Manage',
      items: [
        { key: 'tables', label: 'Tables', icon: 'grid', path: '/dashboard/tables', access: { anyPermission: ['table:read', 'order:read'] } },
        { key: 'qr', label: 'QR', icon: 'qrCode', path: '/dashboard/qr', access: { anyPermission: ['table:read', 'qr:read'] } },
        { key: 'customers', label: 'Customers', icon: 'users', path: '/dashboard/customers', access: { anyPermission: ['customer:read'] } },
        { key: 'staff', label: 'Staff', icon: 'user', path: '/dashboard/staff', access: { anyPermission: ['staff:read', 'user:read'] } },
        { key: 'roles', label: 'Roles & permissions', icon: 'shield', path: '/dashboard/staff/roles', access: { anyPermission: ['role:read', 'permission:read'] } },
        { key: 'coupons', label: 'Coupons', icon: 'gift', path: '/dashboard/coupons', access: { anyPermission: ['coupon:read', 'pricing:read'] } },
        { key: 'payments', label: 'Payments', icon: 'payment', path: '/dashboard/payments', access: { anyPermission: ['payment:read'], requireFlags: ['payments'] } },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { key: 'notifications', label: 'Notifications', icon: 'bell', path: '/dashboard/notifications', access: { requireFlags: ['notifications'] } },
        { key: 'subscription', label: 'Subscription', icon: 'package', path: '/dashboard/settings?tab=subscription' },
        { key: 'settings', label: 'Settings', icon: 'settings', path: '/dashboard/settings' },
      ],
    },
  ],
};

export const adminNav: NavConfig = {
  app: 'admin',
  groups: [
    {
      items: [
        { key: 'overview', label: 'Overview', icon: 'dashboard', path: '/admin', access: { anyRole: ['super_admin'] } },
        { key: 'organizations', label: 'Organizations', icon: 'store', path: '/admin/organizations', access: { anyRole: ['super_admin'] } },
        { key: 'approvals', label: 'Approvals', icon: 'check', path: '/admin/approvals', access: { anyRole: ['super_admin'] } },
        { key: 'restaurants', label: 'Restaurants', icon: 'utensils', path: '/admin/restaurants', access: { anyRole: ['super_admin'] } },
        { key: 'users', label: 'Users & RBAC', icon: 'users', path: '/admin/users', access: { anyRole: ['super_admin'] } },
      ],
    },
    {
      title: 'Platform',
      items: [
        { key: 'analytics', label: 'Analytics', icon: 'trend', path: '/admin/analytics', access: { anyRole: ['super_admin'] } },
        { key: 'payments', label: 'Payments', icon: 'payment', path: '/admin/payments', access: { anyRole: ['super_admin'] } },
        { key: 'notifications', label: 'Notifications', icon: 'bell', path: '/admin/notifications', access: { anyRole: ['super_admin'] } },
        { key: 'flags', label: 'Feature Flags', icon: 'settings', path: '/admin/flags', access: { anyRole: ['super_admin'] } },
        { key: 'audit', label: 'Audit logs', icon: 'order', path: '/admin/audit', access: { anyRole: ['super_admin'] } },
        { key: 'monitoring', label: 'Monitoring', icon: 'trend', path: '/admin/monitoring', access: { anyRole: ['super_admin'] } },
        { key: 'settings', label: 'Platform settings', icon: 'settings', path: '/admin/settings', access: { anyRole: ['super_admin'] } },
      ],
    },
  ],
};

export const kitchenNav: NavConfig = {
  app: 'kitchen',
  groups: [
    {
      items: [
        { key: 'queue', label: 'Queue', icon: 'flame', path: '/', access: { anyPermission: ['kitchen:read'] } },
        { key: 'stations', label: 'Stations', icon: 'grid', path: '/stations', access: { anyPermission: ['station:read'] } },
      ],
    },
  ],
};

export const navConfigs = { customer: customerNav, restaurant: restaurantNav, admin: adminNav, kitchen: kitchenNav } as const;
