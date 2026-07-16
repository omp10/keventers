import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

import { Spinner } from '@/design-system';
import { usePermissions } from '@/platform/permissions';
import type { AccessRule } from '@/platform/permissions';
import { useAuth } from './useAuth';

function AuthLoading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Spinner size="lg" />
    </div>
  );
}

/**
 * ROUTE GUARDS — reusable, config-driven wrappers so pages NEVER check auth
 * themselves. Compose them in the router. All redirect to a login route while
 * preserving the intended destination.
 */
export type RouteGuardProps = {
  children: ReactNode;
  /** Where to send unauthenticated users. */
  redirectTo?: string;
  /** Access rule (roles/permissions/flags) required to view the route. */
  rule?: AccessRule;
  /** Where to send authorized-but-forbidden users. */
  forbiddenTo?: string;
  /** Allow guest (QR) sessions through (customer flows). */
  allowGuest?: boolean;
};

export function RouteGuard({ children, redirectTo = '/login', rule, forbiddenTo = '/403', allowGuest = false }: RouteGuardProps) {
  const { status, isAuthenticated, isGuest } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();

  if (status === 'loading') return <AuthLoading />;

  const passesAuth = isAuthenticated || (allowGuest && isGuest);
  if (!passesAuth) return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;

  if (rule && !can(rule)) return <Navigate to={forbiddenTo} replace />;

  return <>{children}</>;
}

/** Require an authenticated staff/customer session. */
export function RequireAuth({ children, ...props }: Omit<RouteGuardProps, 'rule'>) {
  return <RouteGuard {...props}>{children}</RouteGuard>;
}

/** Require specific role(s). */
export function RequireRole({ roles, children, ...props }: { roles: string[] } & Omit<RouteGuardProps, 'rule'>) {
  return <RouteGuard rule={{ anyRole: roles }} {...props}>{children}</RouteGuard>;
}

/** Require specific permission(s). */
export function RequirePermission({ permissions, children, ...props }: { permissions: string[] } & Omit<RouteGuardProps, 'rule'>) {
  return <RouteGuard rule={{ anyPermission: permissions }} {...props}>{children}</RouteGuard>;
}

/** Redirect already-authenticated users AWAY from auth pages (login/register). */
export function GuestOnly({ children, redirectTo = '/' }: { children: ReactNode; redirectTo?: string }) {
  const { status, isAuthenticated } = useAuth();
  if (status === 'loading') return <AuthLoading />;
  return isAuthenticated ? <Navigate to={redirectTo} replace /> : <>{children}</>;
}
