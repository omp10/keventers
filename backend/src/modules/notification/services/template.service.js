import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, NotFoundError } from '#core/errors/app-error.js';

import {
  DEFAULT_LOCALE,
  NOTIFICATION_ERRORS,
} from '../constants/notification.constants.js';
import { defaultTemplateFor } from '../constants/default-templates.js';
import { toTemplateDTO } from '../dto/notification.dto.js';
import { templateRepository } from '../repositories/template.repository.js';
import { entityId } from '../utils/id.util.js';
import { extractVariables, renderTemplate } from '../utils/template-render.util.js';
import { assertStaffAccess, loadForStaff, resolveRestaurantScope } from '../utils/tenant.util.js';

/**
 * Template service. Resolves the effective template (restaurant → org → global,
 * locale fallback), renders it against event variables, and manages the
 * restaurant/admin template catalog. A missing DB template falls back to the
 * built-in platform default, so a notification NEVER fails for want of a
 * template. Template changes are audited.
 */
export class TemplateService extends BaseService {
  constructor({ templates = templateRepository, resolveScope = resolveRestaurantScope, eventBus } = {}) {
    super({ name: 'notification.template', eventBus });
    this.templates = templates;
    this.resolveScope = resolveScope;
  }

  /**
   * Render a notification for (scope, key, channel, locale, variables). Returns
   * `{ subject, body, source }` where source ∈ 'db' | 'default'.
   */
  async render(scope, key, channel, locale = DEFAULT_LOCALE, variables = {}) {
    const tpl = await this.templates.resolve(scope, key, channel, locale);
    if (tpl) return { ...renderTemplate(tpl, variables), source: 'db' };
    const fallback = defaultTemplateFor(key);
    if (fallback) return { ...renderTemplate(fallback, variables), source: 'default' };
    return { subject: null, body: '', source: 'none' };
  }

  // ==================== CATALOG (staff / admin) ====================

  async createTemplate(tenant, restaurantId, data, actorId = null) {
    const scope = restaurantId ? await this.resolveScope(tenant, restaurantId) : { organizationId: null, restaurantId: null };
    if (!data.body) throw new BadRequestError(NOTIFICATION_ERRORS.INVALID_TEMPLATE);
    const template = await this.templates.create({
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      key: data.key,
      channel: data.channel,
      locale: data.locale ?? DEFAULT_LOCALE,
      category: data.category,
      subject: data.subject ?? null,
      body: data.body,
      variables: data.variables ?? extractVariables({ subject: data.subject, body: data.body }),
      isActive: data.isActive ?? true,
    });
    this.audit.success('notification.template.created', { actorId, targetId: entityId(template), metadata: { key: data.key, channel: data.channel } });
    return toTemplateDTO(template);
  }

  async listTemplates(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const page = await this.templates.paginateForStaff(scope, {
      filter: { ...(query.key ? { key: query.key } : {}), ...(query.channel ? { channel: query.channel } : {}) },
      search: query.search,
      sort: query.sort ?? 'key',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, toTemplateDTO);
  }

  async updateTemplate(tenant, id, data, actorId = null) {
    const template = await loadForStaff(this.templates, tenant, id, NOTIFICATION_ERRORS.TEMPLATE_NOT_FOUND);
    const patch = {};
    for (const f of ['subject', 'body', 'category', 'isActive', 'locale']) if (data[f] !== undefined) patch[f] = data[f];
    if (data.body !== undefined || data.subject !== undefined) {
      patch.variables = extractVariables({ subject: data.subject ?? template.subject, body: data.body ?? template.body });
      patch.version = (template.version ?? 1) + 1; // versioning: bump on content change
    }
    const updated = await this.templates.updateById(entityId(template), patch);
    this.audit.success('notification.template.updated', { actorId, targetId: entityId(template) });
    return toTemplateDTO(updated);
  }

  async deleteTemplate(tenant, id, actorId = null) {
    const template = await loadForStaff(this.templates, tenant, id, NOTIFICATION_ERRORS.TEMPLATE_NOT_FOUND);
    assertStaffAccess(tenant, template);
    await this.templates.softDeleteById(entityId(template));
    this.audit.success('notification.template.deleted', { actorId, targetId: entityId(template) });
    return { id: entityId(template), deleted: true };
  }

  /** Preview render (staff tooling). */
  async preview(tenant, id, variables = {}) {
    const template = await loadForStaff(this.templates, tenant, id, NOTIFICATION_ERRORS.TEMPLATE_NOT_FOUND);
    return renderTemplate(template, variables);
  }
}

export const templateService = new TemplateService();
export default templateService;
