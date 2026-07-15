import { BaseSeeder } from '#database/seeds/base.seeder.js';
import { ErrorCode } from '#core/errors/error-codes.js';
import { logger as baseLogger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';
import { permissionService } from '#modules/identity/index.js';

import { DEFAULT_LOCALE, EXTERNAL_CHANNELS, CHANNEL, NOTIFICATION_NEW_PERMISSIONS } from '../constants/notification.constants.js';
import { DEFAULT_TEMPLATES } from '../constants/default-templates.js';
import { NotificationTemplate } from '../models/notification-template.model.js';
import { extractVariables } from '../utils/template-render.util.js';

/**
 * Seeds the Notification Engine's net-new permissions AND the platform-global
 * default templates (one active row per key × channel × `en`). Idempotent —
 * templates are upserted on (global scope, key, channel, locale); permissions
 * skip on conflict. Registered after the customer seeder.
 */
export class NotificationSeeder extends BaseSeeder {
  constructor({ permissions = permissionService, rbac = { permissionRegistry }, templateModel = NotificationTemplate, logger } = {}) {
    super();
    this.name = '010-notification-core';
    this.permissions = permissions;
    this.rbac = rbac;
    this.templateModel = templateModel;
    this.logger = logger ?? baseLogger({ module: 'notification', component: 'seeder' });
  }

  async run(context = {}) {
    if (context.logger) this.logger = context.logger;
    const summary = { permissions: { created: 0, skipped: 0 }, templates: { upserted: 0 } };

    for (const perm of NOTIFICATION_NEW_PERMISSIONS) {
      const name = `${perm.resource}:${perm.action}`;
      this.rbac.permissionRegistry.register(name);
      try {
        await this.permissions.createPermission(perm, null);
        summary.permissions.created += 1;
      } catch (err) {
        if (err?.code === ErrorCode.CONFLICT) summary.permissions.skipped += 1;
        else throw err;
      }
    }

    // Seed platform-global default templates for every channel.
    const channels = [CHANNEL.IN_APP, ...EXTERNAL_CHANNELS];
    for (const [key, tpl] of Object.entries(DEFAULT_TEMPLATES)) {
      for (const channel of channels) {
        await this.templateModel.updateOne(
          { organizationId: null, restaurantId: null, key, channel, locale: DEFAULT_LOCALE },
          {
            $setOnInsert: {
              organizationId: null,
              restaurantId: null,
              key,
              channel,
              locale: DEFAULT_LOCALE,
              category: tpl.category,
              subject: channel === CHANNEL.SMS ? null : tpl.subject,
              body: tpl.body,
              variables: extractVariables(tpl),
              version: 1,
              isActive: true,
            },
          },
          { upsert: true },
        );
        summary.templates.upserted += 1;
      }
    }

    this.logger.info({ summary }, 'Notification seed complete');
    return summary;
  }
}

export const notificationSeeder = new NotificationSeeder();
export default notificationSeeder;
