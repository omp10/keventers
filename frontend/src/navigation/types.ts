import type { ReactNode } from 'react';

import type { IconName } from '@/design-system';
import type { AccessRule } from '@/platform/permissions';

/**
 * NAVIGATION PLATFORM types. Navigation is CONFIGURATION — never hardcoded in
 * components. Each item carries an optional `access` rule (roles/permissions/
 * flags); the resolver hides items the current user can't see, so nav visibility
 * is centralized and consistent with route guards.
 */
export type NavNode = {
  key: string;
  label: string;
  icon?: IconName;
  path?: string;
  /** Access rule — item is hidden unless satisfied. */
  access?: AccessRule;
  /** Optional badge (e.g. a live count) resolved by the app. */
  badge?: ReactNode;
  /** Render as the raised primary action in the customer tab bar (Scan). */
  emphasized?: boolean;
  /** Nested items (sidebar groups). */
  children?: NavNode[];
  /** Exclude from the command palette / search surfacing. */
  hiddenFromCommand?: boolean;
};

export type NavGroup = {
  title?: string;
  access?: AccessRule;
  items: NavNode[];
};

/** A full app's navigation definition. */
export type NavConfig = {
  app: 'customer' | 'restaurant' | 'admin' | 'kitchen';
  /**
   * Where "Home" means for THIS app. These are separate apps sharing one
   * router, so a root of '/' is only correct for the customer one — everywhere
   * else it ejects staff out of their app and into the storefront.
   */
  root: string;
  groups: NavGroup[];
  /** Bottom-tab items (customer PWA). */
  tabs?: NavNode[];
};
