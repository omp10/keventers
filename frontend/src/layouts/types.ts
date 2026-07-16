import { createElement, type ReactNode } from 'react';

import type { IconName } from '@/design-system';

/** A navigation entry — shared by every shell (sidebar, bottom nav, command). */
export type NavItem = {
  key: string;
  label: string;
  icon?: IconName;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: ReactNode;
  /** Render as the shell's PRIMARY action (e.g. raised center tab in the
   *  customer bottom nav). At most one item per nav should set this. */
  emphasized?: boolean;
  /** Nested items (sidebar sections). */
  children?: NavItem[];
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

/** Consumers pass this to plug their router's <Link> in place of <a>. */
export type RenderLink = (item: NavItem, children: ReactNode, className?: string) => ReactNode;

export const defaultRenderLink: RenderLink = (item, children, className) =>
  createElement('a', { href: item.href, onClick: item.onClick, className }, children);
