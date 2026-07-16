import { api } from '@/platform/api';
import type { QrCode, RestaurantTable, TableGroup } from '../types';

/**
 * TABLE + QR SERVICES — consume the backend QR Ordering module (tables, groups, QR
 * codes, sessions). Table status/occupancy and QR validity are backend-owned; the
 * UI edits layout + triggers actions.
 */
export type TableFilters = { q?: string; status?: string; groupId?: string };

class TableService {
  list(filters?: TableFilters) {
    return api.get<RestaurantTable[]>('/restaurant/tables', { query: filters });
  }
  create(body: Partial<RestaurantTable>) {
    return api.post<RestaurantTable>('/restaurant/tables', body);
  }
  update(id: string, patch: Partial<RestaurantTable>) {
    return api.patch<RestaurantTable>(`/restaurant/tables/${id}`, patch);
  }
  remove(id: string) {
    return api.delete<{ ok: true }>(`/restaurant/tables/${id}`);
  }
  /** Persist floor-layout positions after drag-and-drop. */
  saveLayout(positions: { id: string; x: number; y: number }[]) {
    return api.post<{ ok: true }>('/restaurant/tables/layout', { positions });
  }
  merge(tableIds: string[]) {
    return api.post<{ ok: true }>('/restaurant/tables/merge', { tableIds });
  }
  split(tableId: string) {
    return api.post<{ ok: true }>(`/restaurant/tables/${tableId}/split`);
  }
  move(tableId: string, groupId: string | null) {
    return api.patch<RestaurantTable>(`/restaurant/tables/${tableId}`, { groupId });
  }
  groups() {
    return api.get<TableGroup[]>('/restaurant/table-groups');
  }
  createGroup(name: string) {
    return api.post<TableGroup>('/restaurant/table-groups', { name });
  }
}

export type QrFilters = { q?: string; type?: string; active?: boolean };

class QrService {
  list(filters?: QrFilters) {
    return api.get<QrCode[]>('/restaurant/qr', { query: filters });
  }
  generate(body: { type: string; tableId?: string; label?: string }) {
    return api.post<QrCode>('/restaurant/qr', body);
  }
  regenerate(id: string) {
    return api.post<QrCode>(`/restaurant/qr/${id}/regenerate`);
  }
  rotate(id: string) {
    return api.post<QrCode>(`/restaurant/qr/${id}/rotate`);
  }
  setActive(id: string, active: boolean) {
    return api.patch<QrCode>(`/restaurant/qr/${id}`, { active });
  }
  analytics(id: string) {
    return api.get<{ scans: number; series?: { label: string; value: number }[] }>(`/restaurant/qr/${id}/analytics`);
  }
  bulkDownloadUrl(ids: string[]) {
    return `/restaurant/qr/download?ids=${ids.join(',')}`;
  }
}

export const tableService = new TableService();
export const qrService = new QrService();
