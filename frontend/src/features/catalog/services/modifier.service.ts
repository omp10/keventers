import { api } from '@/platform/api';
import type { AddonDraft, ModifierGroupDraft, VariantDraft } from '../types';
import type { BulkAction } from './product.service';
import { fetchAll } from './fetch-all';

/** MODIFIER GROUP SERVICE — reusable modifier groups (required/optional, min/max). */
class ModifierGroupService {
  /** Complete list — the product editor attaches from it, so it must be whole. */
  list() {
    return fetchAll<ModifierGroupDraft>('/restaurant/modifiers');
  }
  get(id: string) {
    return api.get<ModifierGroupDraft>(`/restaurant/modifiers/${id}`);
  }
  create(draft: Partial<ModifierGroupDraft>) {
    return api.post<ModifierGroupDraft>('/restaurant/modifiers', draft);
  }
  update(id: string, patch: Partial<ModifierGroupDraft>) {
    return api.patch<ModifierGroupDraft>(`/restaurant/modifiers/${id}`, patch);
  }
  reorder(orderedIds: string[]) {
    return api.post<{ ok: true }>('/restaurant/modifiers/reorder', { orderedIds });
  }
  bulk(action: BulkAction, ids: string[], params?: Record<string, unknown>) {
    return api.post<{ ok: true; affected: number }>('/restaurant/modifiers/bulk', { action, ids, params });
  }
}

/** ADD-ON SERVICE — standalone add-ons (pricing, availability, grouping). */
class AddonService {
  list() {
    return fetchAll<AddonDraft>('/restaurant/addons');
  }
  create(draft: Partial<AddonDraft>) {
    return api.post<AddonDraft>('/restaurant/addons', draft);
  }
  update(id: string, patch: Partial<AddonDraft>) {
    return api.patch<AddonDraft>(`/restaurant/addons/${id}`, patch);
  }
  reorder(orderedIds: string[]) {
    return api.post<{ ok: true }>('/restaurant/addons/reorder', { orderedIds });
  }
  bulk(action: BulkAction, ids: string[], params?: Record<string, unknown>) {
    return api.post<{ ok: true; affected: number }>('/restaurant/addons/bulk', { action, ids, params });
  }
}

/** VARIANT SERVICE — product-scoped variants + a cross-catalog view for bulk edits. */
class VariantService {
  listForProduct(productId: string) {
    return api.get<VariantDraft[]>(`/restaurant/products/${productId}/variants`);
  }
  /** Flat cross-catalog variant list (the Variants page). */
  listAll(q?: string) {
    return api.get<(VariantDraft & { productId: string; productName: string })[]>('/restaurant/variants', { query: { q } });
  }
  bulkUpdate(updates: { id: string; patch: Partial<VariantDraft> }[]) {
    return api.post<{ ok: true }>('/restaurant/variants/bulk', { updates });
  }
}

export const modifierGroupService = new ModifierGroupService();
export const addonService = new AddonService();
export const variantService = new VariantService();
