import { IDENTITY_PERMISSIONS } from '../constants/identity.constants.js';

/**
 * The canonical permission catalog + role blueprint for a fresh installation.
 *
 * Wildcards note: concrete `resource:action` permissions are stored as catalog
 * rows (Permission model). Wildcard grants (`*`, `resource:*`) are NOT catalog
 * rows — the RBAC platform's policy evaluator resolves them at authorization
 * time — so they appear only in ROLE_DEFINITIONS. This keeps the catalog
 * concrete while still fully "supporting wildcard permissions".
 */

/** Every resource the platform authorizes against. */
export const RESOURCES = Object.freeze([
  'identity',
  'organization',
  'restaurant',
  'branch',
  'table',
  'qr',
  'menu',
  'category',
  'product',
  'modifier',
  'customer',
  'cart',
  'order',
  'payment',
  'notification',
  'analytics',
  'settings',
]);

/** Standard CRUD actions applied to every resource. */
export const ACTIONS = Object.freeze(['create', 'read', 'update', 'delete']);

/** Convenience wildcard helpers (used in role grants, never stored in catalog). */
export const WILDCARD_ALL = '*';
export const resourceWildcard = (resource) => `${resource}:*`;

/**
 * Build the concrete permission catalog: CRUD per resource + the granular
 * identity permissions already used by the identity route guards. Deduplicated
 * by name.
 *
 * @returns {{ name: string, resource: string, action: string, description: string, isSystem: boolean }[]}
 */
export function buildPermissionCatalog() {
  const byName = new Map();

  const add = (name) => {
    const lower = name.toLowerCase();
    if (byName.has(lower)) return;
    const [resource, ...rest] = lower.split(':');
    byName.set(lower, {
      name: lower,
      resource,
      action: rest.join(':'),
      description: `Auto-seeded permission: ${lower}`,
      isSystem: true,
    });
  };

  for (const resource of RESOURCES) {
    for (const action of ACTIONS) add(`${resource}:${action}`);
  }
  // Granular identity permissions consumed by identity route guards.
  for (const perm of Object.values(IDENTITY_PERMISSIONS)) add(perm);

  return [...byName.values()];
}

/**
 * Production-ready roles with their default permission grants. `isSystem: true`
 * marks them immutable via the IAM API (RoleService refuses to modify them).
 */
export const ROLE_DEFINITIONS = Object.freeze([
  {
    name: 'super_admin',
    displayName: 'Platform Super Admin',
    description: 'Full, unrestricted access to the entire platform.',
    permissions: [WILDCARD_ALL],
    isSystem: true,
    priority: 100,
  },
  {
    name: 'organization_admin',
    displayName: 'Organization Admin',
    description: 'Administers an organization and all of its resources.',
    permissions: [
      'identity:*',
      'organization:*',
      'restaurant:*',
      'branch:*',
      'table:*',
      'qr:*',
      'menu:*',
      'category:*',
      'product:*',
      'modifier:*',
      'customer:*',
      'cart:*',
      'order:*',
      'payment:*',
      'notification:*',
      'analytics:*',
      'settings:*',
    ],
    isSystem: true,
    priority: 90,
  },
  {
    name: 'restaurant_manager',
    displayName: 'Restaurant Manager',
    description: 'Manages a restaurant: menu, branches, tables, staff and orders.',
    permissions: [
      'restaurant:read',
      'branch:*',
      'table:*',
      'qr:*',
      'menu:*',
      'category:*',
      'product:*',
      'modifier:*',
      'order:*',
      'payment:read',
      'payment:update',
      'customer:read',
      'notification:read',
      'analytics:read',
      IDENTITY_PERMISSIONS.USER_READ,
      IDENTITY_PERMISSIONS.STAFF_READ,
    ],
    isSystem: true,
    priority: 80,
  },
  {
    name: 'kitchen_manager',
    displayName: 'Kitchen Manager',
    description: 'Manages kitchen operations and order fulfilment.',
    permissions: [
      'order:read',
      'order:update',
      'menu:read',
      'category:read',
      'product:read',
      'modifier:read',
      'table:read',
      'analytics:read',
    ],
    isSystem: true,
    priority: 70,
  },
  {
    name: 'cashier',
    displayName: 'Cashier',
    description: 'Processes carts, orders and payments at the counter.',
    permissions: [
      'order:*',
      'payment:*',
      'cart:*',
      'customer:read',
      'customer:create',
      'menu:read',
      'product:read',
      'category:read',
      'table:read',
    ],
    isSystem: true,
    priority: 60,
  },
  {
    name: 'waiter',
    displayName: 'Waiter',
    description: 'Takes and manages table orders.',
    permissions: [
      'table:read',
      'table:update',
      'order:create',
      'order:read',
      'order:update',
      'cart:*',
      'menu:read',
      'product:read',
      'category:read',
      'customer:read',
      'customer:create',
    ],
    isSystem: true,
    priority: 50,
  },
  {
    name: 'staff',
    displayName: 'Staff',
    description: 'General staff with read access to operational data.',
    permissions: ['order:read', 'menu:read', 'product:read', 'category:read', 'table:read'],
    isSystem: true,
    priority: 40,
  },
  {
    name: 'customer',
    displayName: 'Customer',
    description: 'End customer placing orders through the platform.',
    permissions: [
      'cart:*',
      'order:create',
      'order:read',
      'menu:read',
      'product:read',
      'category:read',
      'customer:read',
      'customer:update',
    ],
    isSystem: true,
    priority: 10,
  },
]);

/** Role name assigned to the initial Platform Super Admin account. */
export const SUPER_ADMIN_ROLE = 'super_admin';
