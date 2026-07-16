import type { ReactNode } from 'react';

import { usePermissions } from './usePermissions';
import type { AccessRule } from './engine';

export type CanProps = AccessRule & {
  children: ReactNode;
  /** Rendered when access is denied (default: nothing). */
  fallback?: ReactNode;
};

/**
 * Can — declarative COMPONENT/ACTION guard. Wrap any element (a button, a menu
 * item, a section) to render it only when the current user satisfies the rule.
 * The rule is the same shape used by nav config + route guards → one model.
 *
 *   <Can anyPermission={['order:manage']}><Button>Refund</Button></Can>
 */
export function Can({ children, fallback = null, ...rule }: CanProps) {
  const { can } = usePermissions();
  return <>{can(rule) ? children : fallback}</>;
}
