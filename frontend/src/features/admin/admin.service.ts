import { api, type Paginated } from '@/platform/api';
import type { NotificationRecord, OnboardingApplication, OnboardingFieldDefinition, OnboardingFormConfig, Organization, PlatformKpis, PlatformPayment, PlatformUser } from './types';

export type AdminFilters = { search?: string; status?: string; type?: string; provider?: string; from?: string; to?: string };
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
  notifications: (filters: AdminFilters, p = 1, limit = 25): Promise<Paginated<NotificationRecord>> => api.paginate('/admin/notifications', { query: page(filters, p, limit) }),
  campaigns: (p = 1, limit = 25) => api.paginate('/admin/notification-campaigns', { query: { page: p, limit } }),
};
