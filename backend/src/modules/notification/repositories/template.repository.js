import { DEFAULT_LOCALE } from '../constants/notification.constants.js';
import { NotificationTemplate } from '../models/notification-template.model.js';

import { NotificationScopedRepository } from './notification-scoped.repository.js';

/**
 * Template repository. Resolution prefers the MOST SPECIFIC active template:
 * restaurant override → org → platform-global, with locale fallback to the
 * default. This lets restaurants override copy without duplicating the platform
 * catalog.
 */
export class TemplateRepository extends NotificationScopedRepository {
  constructor(model = NotificationTemplate) {
    super(model, { softDelete: true, searchableFields: ['key', 'subject', 'body'] });
  }

  /**
   * Resolve the effective template for (scope, key, channel, locale).
   * @param {{organizationId?, restaurantId?}} scope
   */
  async resolve({ organizationId = null, restaurantId = null }, key, channel, locale = DEFAULT_LOCALE) {
    const locales = locale === DEFAULT_LOCALE ? [locale] : [locale, DEFAULT_LOCALE];
    // Preference order: restaurant → org → global; per-locale fallback.
    const scopes = [
      { organizationId, restaurantId },
      { organizationId, restaurantId: null },
      { organizationId: null, restaurantId: null },
    ];
    for (const loc of locales) {
      for (const sc of scopes) {
        if (sc.restaurantId && !restaurantId) continue;
        if (sc.organizationId && !organizationId) continue;
        const tpl = await this.findOne({ ...sc, key, channel, locale: loc, isActive: true, deletedAt: null });
        if (tpl) return tpl;
      }
    }
    return null;
  }

  findByKey(key) {
    return this.find({ key, deletedAt: null }, { sort: 'channel locale' });
  }

  paginateForStaff(scope, params = {}) {
    return this.paginate({
      ...params,
      filter: { ...(params.filter ?? {}), organizationId: scope.organizationId, restaurantId: scope.restaurantId },
      allowedFilterFields: ['key', 'channel', 'category', 'locale', 'isActive', 'organizationId', 'restaurantId'],
    });
  }
}

export const templateRepository = new TemplateRepository();
export default templateRepository;
