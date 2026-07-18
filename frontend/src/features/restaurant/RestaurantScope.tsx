import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { api, type RequestConfig } from '@/platform/api';

/**
 * RESTAURANT SCOPE — which restaurant a management page acts on.
 *
 * In the restaurant dashboard the value is `undefined`: the backend derives the
 * tenant from the signed-in manager, so no id is sent. In the platform admin a
 * super-admin PICKS a restaurant, so its id is threaded onto every
 * `/restaurant/*` call as `?restaurantId=` — the same pages then manage any
 * outlet without a second copy.
 */
const RestaurantScopeContext = createContext<string | undefined>(undefined);

export function RestaurantScopeProvider({ restaurantId, children }: { restaurantId?: string; children: ReactNode }) {
  return <RestaurantScopeContext.Provider value={restaurantId}>{children}</RestaurantScopeContext.Provider>;
}

/** The active scope id (undefined = "my own restaurant"). Use it in query keys. */
export function useRestaurantScope(): string | undefined {
  return useContext(RestaurantScopeContext);
}

/**
 * An API surface that injects the scope's `restaurantId` into every request's
 * query. Drop-in for the platform `api` on scoped management pages.
 */
export function useScopedApi() {
  const restaurantId = useRestaurantScope();
  return useMemo(() => {
    const withScope = (config?: RequestConfig): RequestConfig => ({
      ...config,
      query: restaurantId ? { ...config?.query, restaurantId } : config?.query,
    });
    return {
      restaurantId,
      get: <T,>(path: string, config?: RequestConfig) => api.get<T>(path, withScope(config)),
      post: <T,>(path: string, body?: unknown, config?: RequestConfig) => api.post<T>(path, body, withScope(config)),
      patch: <T,>(path: string, body?: unknown, config?: RequestConfig) => api.patch<T>(path, body, withScope(config)),
      delete: <T,>(path: string, config?: RequestConfig) => api.delete<T>(path, withScope(config)),
      paginate: <T,>(path: string, config?: RequestConfig) => api.paginate<T>(path, withScope(config)),
    };
  }, [restaurantId]);
}
