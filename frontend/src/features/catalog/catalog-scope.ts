/**
 * CATALOG SCOPE — which restaurant the catalog services act on.
 *
 * In the restaurant dashboard the backend derives the tenant from the signed-in
 * manager, so nothing is sent (value stays null). In the platform admin a
 * super-admin picks a KITCHEN (outlet); its restaurantId is set here and every
 * catalog request carries `?restaurantId=`, so the SAME catalog pages (products,
 * categories, editor) manage any outlet. Injected — not imported from a feature —
 * so the catalog services stay standalone.
 */
let currentRestaurantId: string | null = null;

export function setCatalogScope(restaurantId: string | null): void {
  currentRestaurantId = restaurantId;
}

export function catalogScope(): string | null {
  return currentRestaurantId;
}

import { api, type RequestConfig } from '@/platform/api';

/**
 * `capi` — the catalog module's API surface. Identical to the platform `api`,
 * but it stamps the active scope's `restaurantId` onto every request's query.
 * Every catalog service talks through this, so scoping is one import swap, not
 * 30 call-site edits — and the dashboard (unscoped) is unaffected.
 */
function scoped(config?: RequestConfig): RequestConfig {
  if (!currentRestaurantId) return config ?? {};
  return { ...config, query: { ...config?.query, restaurantId: currentRestaurantId } };
}

export const capi = {
  get: <T,>(path: string, config?: RequestConfig) => api.get<T>(path, scoped(config)),
  post: <T,>(path: string, body?: unknown, config?: RequestConfig) => api.post<T>(path, body, scoped(config)),
  patch: <T,>(path: string, body?: unknown, config?: RequestConfig) => api.patch<T>(path, body, scoped(config)),
  delete: <T,>(path: string, config?: RequestConfig) => api.delete<T>(path, scoped(config)),
  paginate: <T,>(path: string, config?: RequestConfig) => api.paginate<T>(path, scoped(config)),
  upload: <T,>(path: string, form: FormData, config?: RequestConfig) => api.upload<T>(path, form, scoped(config)),
};
