import { capi } from '../catalog-scope';
import type { Category } from '../types';

/**
 * CATEGORY SERVICE — nested categories, reordering, visibility.
 *
 * This is the ONE place the catalog's category wire format is translated. The
 * backend DTO and the shape the UI wants differ in names (`subcategories` vs
 * `children`, `displayOrder` vs `order`, `iconUrl` vs `icon`) and in one concept:
 * the API has no `visible` flag — `status: active | inactive` IS the visibility.
 * Mapping here keeps every component speaking one vocabulary, and keeps that
 * vocabulary honest about what the server can actually store.
 *
 * Max nesting depth is enforced by the BACKEND (the UI mirrors it, never owns it).
 */

/** What a category selection can be acted on with — mirrors the real endpoints. */
export type CategoryBulkAction = 'show' | 'hide' | 'delete';

/** The category exactly as the API returns it. */
type CategoryWire = {
  id: string;
  parentId: string | null;
  depth: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
  iconUrl?: string | null;
  status: 'active' | 'inactive';
  isFeatured?: boolean;
  displayOrder?: number;
  subcategories?: CategoryWire[];
  updatedAt?: string;
};

function toCategory(w: CategoryWire): Category {
  return {
    id: w.id,
    name: w.name,
    slug: w.slug,
    description: w.description || undefined,
    parentId: w.parentId ?? null,
    order: w.displayOrder ?? 0,
    icon: w.iconUrl ?? undefined,
    // The API stores a bare URL, not a media record; the id echoes it so the
    // MediaManager has a stable key without inventing provenance we don't have.
    image: w.imageUrl ? { id: w.imageUrl, url: w.imageUrl } : null,
    visible: w.status === 'active',
    featured: w.isFeatured ?? false,
    children: w.subcategories?.map(toCategory),
    updatedAt: w.updatedAt,
  };
}

/** View → wire. Only fields the API actually accepts are sent. */
function toWire(c: Partial<Category>) {
  const body: Record<string, unknown> = {};
  if (c.name !== undefined) body.name = c.name;
  if (c.description !== undefined) body.description = c.description;
  if (c.parentId !== undefined) body.parentId = c.parentId;
  if (c.order !== undefined) body.displayOrder = c.order;
  if (c.icon !== undefined) body.iconUrl = c.icon || undefined;
  if (c.image !== undefined) body.imageUrl = c.image?.url || undefined;
  if (c.visible !== undefined) body.status = c.visible ? 'active' : 'inactive';
  if (c.featured !== undefined) body.isFeatured = c.featured;
  return body;
}

class CategoryService {
  async tree(): Promise<Category[]> {
    return (await capi.get<CategoryWire[]>('/restaurant/categories/tree')).map(toCategory);
  }

  /**
   * Every category, flattened — what the pickers and filters need.
   *
   * Built from `/tree` rather than `/restaurant/categories` because that endpoint
   * is PAGINATED (default limit 20, hard cap 100). A picker missing a category is
   * worse than one that errors: it looks like the category doesn't exist.
   */
  async list(): Promise<Category[]> {
    const flatten = (nodes: Category[], acc: Category[] = []): Category[] => {
      for (const n of nodes) {
        acc.push(n);
        if (n.children?.length) flatten(n.children, acc);
      }
      return acc;
    };
    return flatten(await this.tree());
  }

  async get(id: string): Promise<Category> {
    return toCategory(await capi.get<CategoryWire>(`/restaurant/categories/${id}`));
  }

  async create(draft: Partial<Category>): Promise<Category> {
    return toCategory(await capi.post<CategoryWire>('/restaurant/categories', toWire(draft)));
  }

  async update(id: string, patch: Partial<Category>): Promise<Category> {
    return toCategory(await capi.patch<CategoryWire>(`/restaurant/categories/${id}`, toWire(patch)));
  }

  /**
   * Persist a drag-and-drop reordering (and any re-parenting it implies).
   *
   * There is no bulk reorder endpoint, so this is N patches. Sequential, not
   * Promise.all: re-parenting is depth-validated server-side, and firing the
   * writes concurrently makes a partial failure land in an order nobody can
   * reason about. A dozen categories is a dozen small writes — fine.
   */
  async reorder(items: { id: string; parentId: string | null; order: number }[]): Promise<void> {
    for (const { id, parentId, order } of items) {
      await this.update(id, { parentId, order });
    }
  }

  setVisibility(id: string, visible: boolean) {
    return this.update(id, { visible });
  }

  /** Soft-delete (the API's DELETE is a soft delete). */
  remove(id: string) {
    return capi.delete<{ ok: true }>(`/restaurant/categories/${id}`);
  }

  /**
   * Apply one action across a selection. Categories have no bulk endpoint, so
   * this fans out over the per-category ones — sequential, so a failure halfway
   * leaves a prefix applied rather than an arbitrary scatter.
   */
  async bulk(action: CategoryBulkAction, ids: string[]): Promise<void> {
    for (const id of ids) {
      if (action === 'delete') await this.remove(id);
      else await this.setVisibility(id, action === 'show');
    }
  }
}

export const categoryService = new CategoryService();
