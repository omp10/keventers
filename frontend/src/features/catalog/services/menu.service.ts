import { api } from '@/platform/api';
import type { Menu, Schedule } from '../types';
import { fetchAll } from './fetch-all';

/**
 * MENU SERVICE — manage the restaurant's menus (multiple menus, active menu,
 * schedule/duplicate/archive/publish). All state transitions are backend-owned.
 */
class MenuService {
  list() {
    return fetchAll<Menu>('/restaurant/menus');
  }

  get(id: string) {
    return api.get<Menu>(`/restaurant/menus/${id}`);
  }

  create(draft: Partial<Menu>) {
    return api.post<Menu>('/restaurant/menus', draft);
  }

  update(id: string, patch: Partial<Menu>) {
    return api.patch<Menu>(`/restaurant/menus/${id}`, patch);
  }

  duplicate(id: string) {
    return api.post<Menu>(`/restaurant/menus/${id}/duplicate`);
  }

  archive(id: string) {
    return api.post<Menu>(`/restaurant/menus/${id}/archive`);
  }

  publish(id: string) {
    return api.post<Menu>(`/restaurant/menus/${id}/publish`);
  }

  schedule(id: string, schedule: Schedule) {
    return api.post<Menu>(`/restaurant/menus/${id}/schedule`, schedule);
  }

  setActive(id: string) {
    return api.post<Menu>(`/restaurant/menus/${id}/activate`);
  }
}

export const menuService = new MenuService();
