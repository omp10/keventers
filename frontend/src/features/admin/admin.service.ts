import { api, type Paginated } from '@/platform/api';
import type { AdminBanner, AdminCategory, AdminKitchen, AdminZone, BannerPayload, CatalogCategory, CatalogCategoryPayload, CatalogProduct, CatalogProductPayload, CatalogStats, CategoryPayload, KitchenCatalog, KitchenOrder, KitchenQrCode, KitchenStaffResponse, KitchenTable, NotificationRecord, OnboardingApplication, OnboardingFieldDefinition, OnboardingFormConfig, Organization, PlatformKpis, PlatformOrder, PlatformPayment, PlatformUser, RestaurantOption, UploadedMedia } from './types';

export type AdminFilters = { search?: string; status?: string; type?: string; provider?: string; from?: string; to?: string };

/**
 * Progressive scope for admin analytics. A super admin has no primary tenant, so
 * each level is explicit; `branchId` reads a single outlet's projections.
 */
export type AdminAnalyticsScope = { organizationId?: string; restaurantId?: string; branchId?: string; from?: string; to?: string };
const page = (filters: AdminFilters, pageNumber: number, limit: number) => ({ ...filters, page: pageNumber, limit });

export const adminService = {
  dashboard: (filters: AdminFilters = {}) => api.get<PlatformKpis>('/admin/analytics/platform', { query: filters }),
  revenue: (filters: AdminFilters = {}) => api.get<unknown>('/admin/analytics/revenue', { query: filters }),
  organizations: (filters: AdminFilters, p = 1, limit = 25): Promise<Paginated<Organization>> => api.paginate('/admin/organizations', { query: page(filters, p, limit) }),
  organization: (id: string) => api.get<Organization>(`/admin/organizations/${id}`),
  organizationAction: (id: string, action: 'activate' | 'suspend', reason?: string) => api.post<Organization>(`/admin/organizations/${id}/${action}`, reason ? { reason } : undefined),
  applications: (filters: AdminFilters, p = 1, limit = 25): Promise<Paginated<OnboardingApplication>> => api.paginate('/admin/onboarding/applications', { query: page(filters, p, limit) }),
  application: (id: string) => api.get<OnboardingApplication>(`/admin/onboarding/applications/${id}`),
  approve: (id: string) => api.post(`/admin/onboarding/${id}/approve`, {}),
  reject: (id: string, reason: string) => api.post(`/admin/onboarding/${id}/reject`, { reason }),
  onboardingForm: (): Promise<OnboardingFormConfig> => api.get('/admin/onboarding/form-config'),
  updateOnboardingForm: (fields: OnboardingFieldDefinition[]): Promise<OnboardingFormConfig> => api.put('/admin/onboarding/form-config', { fields }),
  users: (filters: AdminFilters, p = 1, limit = 25): Promise<Paginated<PlatformUser>> => api.paginate('/identity/users', { query: { ...page(filters, p, limit), search: filters.search } }),
  userAction: (id: string, action: 'enable' | 'disable') => api.post<PlatformUser>(`/identity/users/${id}/${action}`),
  roles: () => api.paginate<unknown>('/identity/roles', { query: { page: 1, limit: 100 } }),
  payments: (filters: AdminFilters, p = 1, limit = 25): Promise<Paginated<PlatformPayment>> => api.paginate('/admin/payments', { query: page(filters, p, limit) }),
  settlements: (p = 1, limit = 25) => api.paginate('/admin/settlements', { query: { page: p, limit } }),
  /** One order, in full: items, pricing lines, timeline, snapshots, raw ids. */
  order: (id: string) => api.get<Record<string, unknown>>(`/admin/orders/${id}`),
  /** Every order across the platform. Omit restaurantId to span all outlets. */
  orders: (filters: AdminFilters = {}, p = 1, limit = 25): Promise<Paginated<PlatformOrder>> => api.paginate('/admin/orders', { query: page(filters, p, limit) }),
  notifications: (filters: AdminFilters, p = 1, limit = 25): Promise<Paginated<NotificationRecord>> => api.paginate('/admin/notifications', { query: page(filters, p, limit) }),
  campaigns: (p = 1, limit = 25) => api.paginate('/admin/notification-campaigns', { query: { page: p, limit } }),

  /* ── Platform content: banners, categories, zones, kitchens, media ──
     The customer storefront reads these through /public/*; admins own them here. */

  /** Upload an image through the backend Storage Platform (no client keys). */
  uploadImage: (file: File, folder = 'platform', onProgress?: (pct: number) => void): Promise<UploadedMedia> => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<UploadedMedia>('/admin/media/upload', form, { query: { folder }, onUploadProgress: onProgress });
  },

  banners: (filters: AdminFilters, p = 1, limit = 50): Promise<Paginated<AdminBanner>> => api.paginate('/admin/banners', { query: page(filters, p, limit) }),
  createBanner: (body: BannerPayload) => api.post<AdminBanner>('/admin/banners', body),
  updateBanner: (id: string, body: BannerPayload) => api.patch<AdminBanner>(`/admin/banners/${id}`, body),
  deleteBanner: (id: string) => api.delete<{ id: string }>(`/admin/banners/${id}`),

  categories: (filters: AdminFilters, p = 1, limit = 50): Promise<Paginated<AdminCategory>> => api.paginate('/admin/categories', { query: page(filters, p, limit) }),
  createCategory: (body: CategoryPayload) => api.post<AdminCategory>('/admin/categories', body),
  updateCategory: (id: string, body: CategoryPayload) => api.patch<AdminCategory>(`/admin/categories/${id}`, body),
  deleteCategory: (id: string) => api.delete<{ id: string }>(`/admin/categories/${id}`),
  reorderCategories: (ids: string[]) => api.post<{ ids: string[] }>('/admin/categories/reorder', { ids }),

  zones: (filters: AdminFilters, p = 1, limit = 50): Promise<Paginated<AdminZone>> => api.paginate('/admin/zones', { query: page(filters, p, limit) }),
  createZone: (body: Partial<AdminZone>) => api.post<AdminZone>('/admin/zones', body),
  updateZone: (id: string, body: Partial<AdminZone>) => api.patch<AdminZone>(`/admin/zones/${id}`, body),
  deleteZone: (id: string) => api.delete<{ id: string }>(`/admin/zones/${id}`),

  kitchens: (filters: AdminFilters, p = 1, limit = 25): Promise<Paginated<AdminKitchen>> => api.paginate('/admin/kitchens', { query: page(filters, p, limit) }),
  kitchen: (id: string) => api.get<AdminKitchen>(`/admin/kitchens/${id}`),
  createKitchen: (body: Record<string, unknown>) => api.post<AdminKitchen>('/admin/kitchens', body),
  updateKitchen: (id: string, body: Record<string, unknown>) => api.patch<AdminKitchen>(`/admin/kitchens/${id}`, body),
  deleteKitchen: (id: string) => api.delete<{ id: string }>(`/admin/kitchens/${id}`),
  kitchenRestaurants: () => api.get<RestaurantOption[]>('/admin/kitchens/restaurants'),

  /* ── One kitchen, every angle (the kitchen detail page) ──
     Catalog is RESTAURANT-scoped — every outlet of a brand serves the same menu.
     Tables, QR codes and orders are BRANCH-scoped to this one outlet. */

  kitchenCatalog: (restaurantId: string) => api.get<KitchenCatalog>('/admin/catalog', { query: { restaurantId } }),
  kitchenCatalogStats: (restaurantId: string) => api.get<CatalogStats>('/admin/catalog/stats', { query: { restaurantId } }),
  kitchenTables: (restaurantId: string, branchId: string, limit = 100): Promise<Paginated<KitchenTable>> =>
    api.paginate('/admin/tables', { query: { restaurantId, branchId, page: 1, limit } }),
  /** QR codes for one table. Returns [] when none have been generated yet. */
  tableQrCodes: (tableId: string) => api.get<KitchenQrCode[]>(`/admin/qr/table/${tableId}`),
  /** Troubleshooting actions on a QR. `rotate`/`regenerate` invalidate printed copies. */
  qrAction: (id: string, action: 'regenerate' | 'rotate' | 'disable') => api.post<KitchenQrCode>(`/admin/qr/${id}/${action}`),
  kitchenOrders: (restaurantId: string, branchId: string, p = 1, limit = 10): Promise<Paginated<KitchenOrder>> =>
    api.paginate('/admin/orders', { query: { restaurantId, branchId, page: p, limit } }),
  /** Staff reaching this outlet (branch + brand + org memberships), with role counts. */
  kitchenStaff: (id: string) => api.get<KitchenStaffResponse>(`/admin/kitchens/${id}/staff`),
  /**
   * One outlet's KPIs, read through the same projection path as the platform
   * dashboard but narrowed to a branch. All money is MINOR units (paise).
   */
  kitchenAnalytics: (scope: AdminAnalyticsScope) => api.get<PlatformKpis>('/admin/analytics/platform', { query: scope }),

  /* ── Catalog WRITES ──
     These go through the restaurant-facing routes (`/restaurant/*`), not
     `/admin/catalog` which is read-only inspection. A super admin has no primary
     restaurant, so `restaurantId` must be passed explicitly — the backend has
     nothing to default to and will 403 without it.

     Editing here changes the menu for EVERY outlet of the brand. */

  updateCatalogCategory: (id: string, restaurantId: string, body: CatalogCategoryPayload) =>
    api.patch<CatalogCategory>(`/restaurant/categories/${id}`, body, { query: { restaurantId } }),
  updateCatalogProduct: (id: string, restaurantId: string, body: CatalogProductPayload) =>
    api.patch<CatalogProduct>(`/restaurant/products/${id}`, body, { query: { restaurantId } }),
};
