import { api, type Paginated } from '@/platform/api';
import type { Availability, CatalogProduct, ProductFilters } from '../types';

/**
 * PRODUCT SERVICE — the ONLY place the catalog app talks to the backend Catalog
 * module for products. Components go hooks → this → API Platform. The backend owns
 * all rules (pricing, availability resolution); we send drafts and render
 * results.
 */

/**
 * What the bulk bar can actually do. Every one maps to a single-product
 * endpoint that exists — `duplicate` and `move` used to be listed here with no
 * backend behind them, so offering them only produced a 404.
 */
export type BulkAction = 'publish' | 'unpublish' | 'archive' | 'unarchive' | 'available' | 'unavailable' | 'delete';

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

  /**
   * Publish / unpublish / archive are STATUS changes, not endpoints.
   *
   * A product's lifecycle is the plain `status` field (draft | active |
   * inactive | archived) that `PATCH /:id` already sets — there is no product
   * publish state machine (that exists for MENUS). These used to POST to
   * /publish, /unpublish and /archive, none of which the backend ever served,
   * so every one 404'd.
   */
  publish(id: string) {
    return this.update(id, { status: 'active' });
  }

  unpublish(id: string) {
    return this.update(id, { status: 'inactive' });
  }

  archive(id: string) {
    return this.update(id, { status: 'archived' });
  }

  setAvailability(id: string, availability: Availability) {
    return api.patch<CatalogProduct>(`/restaurant/products/${id}/availability`, availability);
  }

  remove(id: string) {
    return api.delete<{ id: string }>(`/restaurant/products/${id}`);
  }

  /**
   * Bulk actions, fanned out one product at a time.
   *
   * There is no bulk endpoint: this used to POST /restaurant/products/bulk,
   * which the backend never served, so every button in the bulk bar 404'd. Each
   * action is just the single-product call that already exists, so fan them out
   * rather than invent a batch API for a bar that acts on a few selected rows.
   *
   * ponytail: N requests for N selections — fine for a selection bar; add a real
   * bulk endpoint if anyone starts selecting hundreds.
   */
  async bulk(action: BulkAction, ids: string[]): Promise<{ affected: number }> {
    const run = (id: string) => {
      switch (action) {
        case 'publish':
          return this.publish(id);
        case 'unpublish':
          return this.unpublish(id);
        case 'archive':
          return this.archive(id);
        case 'unarchive':
          return this.update(id, { status: 'active' });
        case 'available':
          return this.setAvailability(id, { status: 'available' } as Availability);
        case 'unavailable':
          return this.setAvailability(id, { status: 'out_of_stock' } as Availability);
        case 'delete':
          return this.remove(id);
      }
    };

    const results = await Promise.allSettled(ids.map(run));
    const failures = results.filter((r) => r.status === 'rejected');
    // All failed → surface the real error instead of a silent "0 updated".
    if (ids.length > 0 && failures.length === ids.length) {
      throw (failures[0] as PromiseRejectedResult).reason;
    }
    return { affected: results.length - failures.length };
  }
}

export const productService = new ProductService();
