import { capi } from '../catalog-scope';
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
    return capi.get<ModifierGroupDraft>(`/restaurant/modifiers/${id}`);
  }
  create(draft: Partial<ModifierGroupDraft>) {
    return capi.post<ModifierGroupDraft>('/restaurant/modifiers', draft);
  }
  update(id: string, patch: Partial<ModifierGroupDraft>) {
    return capi.patch<ModifierGroupDraft>(`/restaurant/modifiers/${id}`, patch);
  }
  reorder(orderedIds: string[]) {
    return capi.post<{ ok: true }>('/restaurant/modifiers/reorder', { orderedIds });
  }
  bulk(action: BulkAction, ids: string[], params?: Record<string, unknown>) {
    return capi.post<{ ok: true; affected: number }>('/restaurant/modifiers/bulk', { action, ids, params });
  }
}

/** ADD-ON SERVICE — standalone add-ons (pricing, availability, grouping). */
class AddonService {
  list() {
    return fetchAll<AddonDraft>('/restaurant/addons');
  }
  create(draft: Partial<AddonDraft>) {
    return capi.post<AddonDraft>('/restaurant/addons', draft);
  }
  update(id: string, patch: Partial<AddonDraft>) {
    return capi.patch<AddonDraft>(`/restaurant/addons/${id}`, patch);
  }
  reorder(orderedIds: string[]) {
    return capi.post<{ ok: true }>('/restaurant/addons/reorder', { orderedIds });
  }
  bulk(action: BulkAction, ids: string[], params?: Record<string, unknown>) {
    return capi.post<{ ok: true; affected: number }>('/restaurant/addons/bulk', { action, ids, params });
  }
}

/** VARIANT SERVICE — product-scoped variants + a cross-catalog view for bulk edits. */
class VariantService {
  listForProduct(productId: string) {
    return capi.get<VariantDraft[]>(`/restaurant/products/${productId}/variants`);
  }
  /** Flat cross-catalog variant list (the Variants page). */
  listAll(q?: string) {
    return capi.get<(VariantDraft & { productId: string; productName: string })[]>('/restaurant/variants', { query: { q } });
  }
  create(productId: string, draft: Partial<VariantDraft>) {
    return capi.post<VariantDraft>(`/restaurant/products/${productId}/variants`, draft);
  }
  update(variantId: string, patch: Partial<VariantDraft>) {
    return capi.patch<VariantDraft>(`/restaurant/variants/${variantId}`, patch);
  }
  remove(variantId: string) {
    return capi.delete<{ id: string }>(`/restaurant/variants/${variantId}`);
  }
  bulkUpdate(updates: { id: string; patch: Partial<VariantDraft> }[]) {
    return capi.post<{ ok: true }>('/restaurant/variants/bulk', { updates });
  }
}

export const modifierGroupService = new ModifierGroupService();
export const addonService = new AddonService();
export const variantService = new VariantService();
