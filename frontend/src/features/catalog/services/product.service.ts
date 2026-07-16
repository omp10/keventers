import { api, type Paginated } from '@/platform/api';
import type { Availability, CatalogProduct, ProductFilters } from '../types';

/**
 * PRODUCT SERVICE — the ONLY place the catalog app talks to the backend Catalog
 * module for products. Components go hooks → this → API Platform. The backend owns
 * all rules (pricing, availability resolution, publish state machine); we send
 * drafts and render results. Bulk ops are one endpoint, reused by the bulk bar.
 */
export type BulkAction = 'archive' | 'unarchive' | 'delete' | 'duplicate' | 'publish' | 'unpublish' | 'available' | 'unavailable' | 'move';

function toParams(f: ProductFilters, page: number, limit: number) {
  return {
    q: f.q || undefined,
    categoryId: f.categoryId,
    status: f.status?.length ? f.status.join(',') : undefined,
    availability: f.availability?.length ? f.availability.join(',') : undefined,
    veg: f.veg?.length ? f.veg.join(',') : undefined,
    featured: f.featured || undefined,
    popular: f.popular || undefined,
    sort: f.sort,
    page,
    limit,
  };
}

class ProductService {
  list(filters: ProductFilters, page = 1, limit = 24): Promise<Paginated<CatalogProduct>> {
    return api.paginate<CatalogProduct>('/restaurant/products', { query: toParams(filters, page, limit) });
  }

  get(id: string) {
    return api.get<CatalogProduct>(`/restaurant/products/${id}`);
  }

  create(draft: Partial<CatalogProduct>) {
    return api.post<CatalogProduct>('/restaurant/products', draft);
  }

  update(id: string, patch: Partial<CatalogProduct>) {
    return api.patch<CatalogProduct>(`/restaurant/products/${id}`, patch);
  }

  duplicate(id: string) {
    return api.post<CatalogProduct>(`/restaurant/products/${id}/duplicate`);
  }

  archive(id: string) {
    return api.post<CatalogProduct>(`/restaurant/products/${id}/archive`);
  }

  publish(id: string) {
    return api.post<CatalogProduct>(`/restaurant/products/${id}/publish`);
  }

  unpublish(id: string) {
    return api.post<CatalogProduct>(`/restaurant/products/${id}/unpublish`);
  }

  setAvailability(id: string, availability: Availability) {
    return api.patch<CatalogProduct>(`/restaurant/products/${id}/availability`, availability);
  }

  reorder(categoryId: string, orderedIds: string[]) {
    return api.post<{ ok: true }>('/restaurant/products/reorder', { categoryId, orderedIds });
  }

  /** One bulk endpoint, reused by the bulk action bar. */
  bulk(action: BulkAction, ids: string[], params?: Record<string, unknown>) {
    return api.post<{ ok: true; affected: number }>('/restaurant/products/bulk', { action, ids, params });
  }
}

export const productService = new ProductService();
