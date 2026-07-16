import { api } from '@/platform/api';
import type { Availability, Category } from '../types';
import type { BulkAction } from './product.service';

/**
 * CATEGORY SERVICE — nested categories, reordering, visibility, availability. The
 * tree endpoint returns the hierarchy; reorder persists drag-and-drop order. Max
 * nesting depth is enforced by the BACKEND (the UI mirrors it, never enforces it).
 */
class CategoryService {
  tree() {
    return api.get<Category[]>('/restaurant/categories/tree');
  }

  list() {
    return api.get<Category[]>('/restaurant/categories');
  }

  get(id: string) {
    return api.get<Category>(`/restaurant/categories/${id}`);
  }

  create(draft: Partial<Category>) {
    return api.post<Category>('/restaurant/categories', draft);
  }

  update(id: string, patch: Partial<Category>) {
    return api.patch<Category>(`/restaurant/categories/${id}`, patch);
  }

  /** Persist a reordering (and optional re-parenting) from drag-and-drop. */
  reorder(items: { id: string; parentId: string | null; order: number }[]) {
    return api.post<{ ok: true }>('/restaurant/categories/reorder', { items });
  }

  setVisibility(id: string, visible: boolean) {
    return api.patch<Category>(`/restaurant/categories/${id}`, { visible });
  }

  setAvailability(id: string, availability: Availability) {
    return api.patch<Category>(`/restaurant/categories/${id}/availability`, availability);
  }

  archive(id: string) {
    return api.post<Category>(`/restaurant/categories/${id}/archive`);
  }

  bulk(action: BulkAction, ids: string[], params?: Record<string, unknown>) {
    return api.post<{ ok: true; affected: number }>('/restaurant/categories/bulk', { action, ids, params });
  }
}

export const categoryService = new CategoryService();
