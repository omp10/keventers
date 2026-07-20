import { api, type Paginated } from '@/platform/api';
import type { AccessLog, Permission, Role, SecurityInfo, Staff, StaffDevice, StaffInvite, StaffSession } from '../types';

/**
 * STAFF / IDENTITY / RBAC / SECURITY SERVICES — consume the backend Identity +
 * Organization (memberships) + RBAC modules. The frontend sends drafts + action
 * verbs; the backend resolves effective permissions, tenancy, and sessions. Endpoints
 * are a documented contract, centralized here.
 */
export type StaffFilters = { q?: string; role?: string; branchId?: string; status?: string; department?: string };
export type StaffBulkAction = 'enable' | 'disable' | 'remove' | 'assign_branch' | 'assign_role';

class StaffService {
  list(filters: StaffFilters, page = 1, limit = 25): Promise<Paginated<Staff>> {
    return api.paginate<Staff>('/restaurant/staff', { query: { ...filters, page, limit } });
  }
  get(id: string) {
    return api.get<Staff>(`/restaurant/staff/${id}`);
  }
  invite(body: StaffInvite) {
    return api.post<Staff>('/restaurant/staff/invite', body);
  }
  update(id: string, patch: Partial<Staff>) {
    return api.patch<Staff>(`/restaurant/staff/${id}`, patch);
  }
  setEnabled(id: string, enabled: boolean) {
    return api.post<Staff>(`/restaurant/staff/${id}/${enabled ? 'enable' : 'disable'}`);
  }
  remove(id: string) {
    return api.delete<{ ok: true }>(`/restaurant/staff/${id}`);
  }
  bulk(action: StaffBulkAction, ids: string[], params?: Record<string, unknown>) {
    return api.post<{ ok: true; affected: number }>('/restaurant/staff/bulk', { action, ids, params });
  }
  sessions(id: string) {
    return api.list<StaffSession>(`/restaurant/staff/${id}/sessions`);
  }
  devices(id: string) {
    return api.list<StaffDevice>(`/restaurant/staff/${id}/devices`);
  }
  accessLogs(id: string) {
    return api.list<AccessLog>(`/restaurant/staff/${id}/access-logs`);
  }
  assignRoles(id: string, roles: string[]) {
    return api.post<Staff>(`/restaurant/staff/${id}/roles`, { roles });
  }
  effectivePermissions(id: string) {
    return api.list<string>(`/restaurant/staff/${id}/effective-permissions`);
  }
}

class RoleService {
  list() {
    return api.list<Role>('/restaurant/roles');
  }
  permissions() {
    return api.list<Permission>('/identity/permissions');
  }
  create(body: Partial<Role>) {
    return api.post<Role>('/restaurant/roles', body);
  }
  update(id: string, patch: Partial<Role>) {
    return api.patch<Role>(`/restaurant/roles/${id}`, patch);
  }
}

class SecurityService {
  info() {
    return api.get<SecurityInfo>('/identity/auth/security');
  }
  overview() {
    return this.info();
  }
  changePassword(body: { currentPassword: string; newPassword: string }) {
    return api.post<{ ok: true }>('/identity/auth/change-password', body);
  }
  revokeSession(sessionId: string) {
    return api.post<{ ok: true }>(`/identity/auth/sessions/${sessionId}/revoke`);
  }
  trustDevice(deviceId: string, trusted: boolean) {
    return api.patch<StaffDevice>(`/identity/auth/devices/${deviceId}`, { trusted });
  }
}

export const staffService = new StaffService();
export const roleService = new RoleService();
export const securityService = new SecurityService();
