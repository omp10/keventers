import { randomUUID } from 'node:crypto';

import { BaseService } from '#core/service/base.service.js';
import { BadRequestError } from '#core/errors/app-error.js';
import { staffService } from '#modules/organization/index.js';
import { customerService } from '#modules/customer/index.js';

import {
  AUDIENCE,
  CATEGORY,
  CHANNEL,
  PRIORITY,
  TEMPLATE_KEY,
} from '../constants/notification.constants.js';
import { resolveRestaurantScope } from '../utils/tenant.util.js';
import { outboxService } from './outbox.service.js';

/** How many recipients one broadcast may fan out to. */
const MAX_RECIPIENTS = 500;

/**
 * Admin broadcast — one message, many recipients, through the SAME outbox
 * pipeline every other notification uses. Each recipient gets their own outbox
 * row (so preferences, channel-readiness, retries and delivery history all
 * apply per person exactly as normal), deduped per broadcast+user so a retried
 * request can never double-send.
 *
 * A broadcast targets ONE restaurant's people. The outbox is tenant-scoped, so
 * a "whole platform" blast would have no scope to live in — and in practice an
 * announcement ("kitchen closes early today") is about a place.
 */
export class BroadcastService extends BaseService {
  constructor({ outbox = outboxService, staff = staffService, customers = customerService, eventBus } = {}) {
    super({ name: 'notification.broadcast', eventBus });
    this.outbox = outbox;
    this.staff = staff;
    this.customers = customers;
  }

  /** Resolve the target user ids for an audience within the restaurant. */
  async #recipients(tenant, restaurantId, audience) {
    const ids = new Set();
    if (audience === 'customers' || audience === 'everyone') {
      const page = await this.customers.listForStaff(tenant, restaurantId, { limit: MAX_RECIPIENTS });
      for (const c of page.items ?? []) if (c.userId) ids.add(String(c.userId));
    }
    if (audience === 'staff' || audience === 'everyone') {
      const page = await this.staff.listStaff(tenant, restaurantId, { limit: MAX_RECIPIENTS });
      for (const m of page.items ?? []) if (m.userId) ids.add(String(m.userId));
    }
    return [...ids].slice(0, MAX_RECIPIENTS);
  }

  async broadcast(tenant, { restaurantId, audience = 'customers', title, body }, actorId = null) {
    const scope = await resolveRestaurantScope(tenant, restaurantId);
    const userIds = await this.#recipients(tenant, restaurantId, audience);
    if (!userIds.length) throw new BadRequestError('No recipients found for this audience');

    const broadcastId = randomUUID();
    let queued = 0;
    for (const userId of userIds) {
      await this.outbox.enqueueFromEvent({
        scope,
        eventName: 'admin.broadcast',
        templateKey: TEMPLATE_KEY.ANNOUNCEMENT,
        category: CATEGORY.SYSTEM,
        priority: PRIORITY.HIGH,
        audience: audience === 'staff' ? AUDIENCE.STAFF : AUDIENCE.CUSTOMER,
        recipient: { userId },
        // In-app always lands; push reaches whoever has a registered device.
        channels: [CHANNEL.IN_APP, CHANNEL.PUSH],
        variables: { title, body },
        data: { broadcastId },
        dedupeKey: `broadcast:${broadcastId}:${userId}`,
      });
      queued += 1;
    }

    this.audit.success('notification.broadcast', {
      actorId,
      targetId: broadcastId,
      metadata: { restaurantId: scope.restaurantId, audience, recipients: queued },
    });
    return { broadcastId, audience, recipients: queued };
  }
}

export const broadcastService = new BroadcastService();
export default broadcastService;
