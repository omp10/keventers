import { BaseService } from '#core/service/base.service.js';
import { NotFoundError } from '#core/errors/app-error.js';

import { categoryRepository } from '../repositories/category.repository.js';
import { entityId } from '../utils/id.util.js';
import { slugify, uniqueSlug } from '../utils/slug.util.js';

/** Public DTO — what the customer storefront renders. */
export function toCategoryDTO(category) {
  return {
    id: entityId(category),
    name: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl || undefined,
    icon: category.icon || 'utensils',
    searchTerm: category.searchTerm || category.name,
    sortOrder: category.sortOrder ?? 0,
  };
}

/** Admin DTO — adds the lifecycle fields the dashboard edits. */
export function toCategoryAdminDTO(category) {
  return {
    ...toCategoryDTO(category),
    featured: Boolean(category.featured),
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

/**
 * Storefront category curation — ADMIN-MANAGED browse categories (the home
 * tiles). Pure content: no serviceability or menu logic lives here.
 */
export class CategoryService extends BaseService {
  constructor({ categories = categoryRepository, eventBus } = {}) {
    super({ name: 'org.category', eventBus });
    this.categories = categories;
  }

  async #getOrThrow(id) {
    const category = await this.categories.findById(id);
    if (!category) throw new NotFoundError('Category not found');
    return category;
  }

  /** Unique slug from a name, ignoring one id (for updates). */
  async #slugFor(name, ignoreId = null) {
    return uniqueSlug(slugify(name), async (candidate) => {
      const existing = await this.categories.findOne({ slug: candidate });
      return Boolean(existing) && entityId(existing) !== ignoreId;
    });
  }

  /** PUBLIC: live, featured categories in display order. */
  async listLive() {
    const categories = await this.categories.findLive({ featuredOnly: true });
    return categories.map(toCategoryDTO);
  }

  /** ADMIN: paginated list (any status). */
  async list(query = {}) {
    const page = await this.categories.paginate({
      filter: { ...(query.status ? { status: query.status } : {}) },
      search: query.search,
      sort: query.sort ?? 'sortOrder',
      pagination: { page: query.page, limit: query.limit },
    });
    return { items: page.items.map(toCategoryAdminDTO), meta: page.meta };
  }

  async create(data, actorId = null) {
    const category = await this.categories.create({
      ...data,
      slug: data.slug ? slugify(data.slug) : await this.#slugFor(data.name),
      searchTerm: data.searchTerm || data.name,
      createdBy: actorId,
    });
    this.audit.success('category.created', { actorId, targetId: entityId(category) });
    return toCategoryAdminDTO(category);
  }

  async update(id, data, actorId = null) {
    await this.#getOrThrow(id);
    const patch = { ...data };
    if (data.slug) patch.slug = slugify(data.slug);
    const category = await this.categories.updateById(id, patch);
    this.audit.success('category.updated', { actorId, targetId: id });
    return toCategoryAdminDTO(category);
  }

  async remove(id, actorId = null) {
    await this.#getOrThrow(id);
    await this.categories.deleteById(id);
    this.audit.success('category.deleted', { actorId, targetId: id });
    return { id };
  }

  /** Persist a drag-and-drop reorder in one pass. */
  async reorder(ids = [], actorId = null) {
    await Promise.all(ids.map((id, index) => this.categories.updateById(id, { sortOrder: index })));
    this.audit.success('category.reordered', { actorId });
    return { ids };
  }
}

export const categoryService = new CategoryService();
export default categoryService;
