import { useMemo } from 'react';

import { useAuth } from '@/platform/auth/useAuth';
import { useFeatureFlags } from '@/platform/feature-flags';
import { evaluateAccess, hasAnyRole, hasPermission, type AccessContext, type AccessRule } from './engine';

/**
 * usePermissions — the single authorization hook. Composes the auth session
 * (roles/permissions) with feature flags into an AccessContext and exposes
 * predicates. Guards + navigation visibility + action gating all use this, so
 * authorization logic never leaks into business components.
 */
export function usePermissions() {
  const { roles, permissions, isAuthenticated } = useAuth();
  const { flags } = useFeatureFlags();

  return useMemo(() => {
    const ctx: AccessContext = { roles, permissions, isAuthenticated, flags };
    return {
      ctx,
      can: (rule: AccessRule | undefined) => evaluateAccess(rule, ctx),
      hasPermission: (perm: string) => hasPermission(permissions, perm),
      hasRole: (...required: string[]) => hasAnyRole(roles, required),
      roles,
      permissions,
    };
  }, [roles, permissions, isAuthenticated, flags]);
}
