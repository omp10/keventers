import { BaseService } from '#core/service/base.service.js';
import { ForbiddenError, NotFoundError } from '#core/errors/app-error.js';
import { notificationRegistry } from '#platform/notification/index.js';

import {
  CHANNEL,
  DEFAULT_LOCALE,
  EXTERNAL_CHANNELS,
  NOTIFICATION_ERRORS,
  NOTIFICATION_STATUS,
} from '../constants/notification.constants.js';
import { toDeliveryAttemptDTO, toInboxDTO, toNotificationDTO } from '../dto/notification.dto.js';
import {
  NotificationQueuedEvent,
  NotificationReadEvent,
} from '../events/notification.events.js';
import { deliveryAttemptRepository } from '../repositories/delivery-attempt.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { enqueueDelivery } from '../queue/dispatch.js';
import { dedupeKey } from '../utils/dedupe.util.js';
import { entityId } from '../utils/id.util.js';
import { loadForStaff, resolveRestaurantScope } from '../utils/tenant.util.js';

import { preferenceService } from './preference.service.js';
import { notificationRealtimeService } from './notification-realtime.service.js';
import { templateService } from './template.service.js';

/**
 * Notification orchestrator. Two responsibilities:
 *  1) MATERIALIZE an outbox row into per-channel Notification docs — resolving
 *     recipient contact + preferences, rendering the template, and enqueuing a
 *     delivery job per channel (idempotent by (dedupeKey, channel)). In-app is
 *     always recorded (the inbox); external channels are filtered by preference,
 *     contact availability and provider readiness.
 *  2) READS — the customer in-app inbox (mark-read) and staff/admin history.
 * It never references a concrete provider and never calls source services.
 */
export class NotificationService extends BaseService {
  constructor({
    notifications = notificationRepository,
    attempts = deliveryAttemptRepository,
    templates = templateService,
    preferences = preferenceService,
    realtime = notificationRealtimeService,
    registry = notificationRegistry,
    enqueue = enqueueDelivery,
    resolveScope = resolveRestaurantScope,
    eventBus,
  } = {}) {
    super({ name: 'notification', eventBus });
    this.notifications = notifications;
    this.attempts = attempts;
    this.templates = templates;
    this.preferences = preferences;
    this.realtime = realtime;
    this.registry = registry;
    this.enqueue = enqueue;
    this.resolveScope = resolveScope;
  }

  #channelReady(channel) {
    if (channel === CHANNEL.IN_APP) return true;
    return Boolean(this.registry.get(channel)?.isReady?.());
  }

  #destinationFor(channel, contact) {
    if (channel === CHANNEL.EMAIL) return contact.email;
    if (channel === CHANNEL.SMS || channel === CHANNEL.WHATSAPP) return contact.phone;
    if (channel === CHANNEL.PUSH) return contact.deviceTokens?.length ? contact.deviceTokens : null;
    return null; // in-app
  }

  /**
   * Build Notification docs + enqueue deliveries from a claimed outbox row.
   * Returns the created notifications. Called by the outbox relay/dispatch worker.
   */
  async materializeFromOutbox(outbox) {
    const scope = { organizationId: String(outbox.organizationId), restaurantId: String(outbox.restaurantId), branchId: outbox.branchId ? String(outbox.branchId) : null };
    const rec = outbox.recipient ?? {};
    const userId = rec.userId ? String(rec.userId) : null;
    const pref = userId ? await this.preferences.getForUser(scope, userId).catch(() => null) : null;
    const contact = await this.preferences.resolveContact(pref, userId).catch(() => ({ email: rec.email, phone: rec.phone, deviceTokens: [] }));
    if (rec.email && !contact.email) contact.email = rec.email;
    if (rec.phone && !contact.phone) contact.phone = rec.phone;

    const locale = outbox.variables?.locale ?? DEFAULT_LOCALE;
    const created = [];
    for (const channel of outbox.channels ?? []) {
      // Preference gate (in-app for mandatory categories always passes).
      if (!this.preferences.isAllowed(pref, outbox.category, channel)) continue;
      if (EXTERNAL_CHANNELS.includes(channel)) {
        if (!this.#channelReady(channel)) continue; // provider not configured → skip quietly
      }
      const destination = this.#destinationFor(channel, contact);
      if (channel !== CHANNEL.IN_APP && (destination == null || (Array.isArray(destination) && !destination.length))) continue;

      const rendered = await this.templates.render(scope, outbox.templateKey, channel, locale, outbox.variables ?? {});
      const notification = await this.#createNotification(scope, outbox, channel, rendered, destination);
      if (!notification) continue; // duplicate (already materialized)
      created.push(notification);

      const delayMs = outbox.scheduledAt ? Math.max(0, new Date(outbox.scheduledAt).getTime() - Date.now()) : 0;
      await this.enqueue(entityId(notification), { delayMs });
      await this.events.publish(new NotificationQueuedEvent({ notificationId: entityId(notification), channel, category: outbox.category, restaurantId: scope.restaurantId }));
    }
    return created;
  }

  async #createNotification(scope, outbox, channel, rendered, destination) {
    try {
      return await this.notifications.createScoped(scope, {
        userId: outbox.recipient?.userId ?? null,
        customerId: outbox.recipient?.customerId ?? null,
        sessionId: outbox.recipient?.sessionId ?? null,
        audience: outbox.audience,
        channel,
        category: outbox.category,
        priority: outbox.priority,
        templateKey: outbox.templateKey,
        locale: outbox.variables?.locale ?? DEFAULT_LOCALE,
        subject: rendered.subject,
        body: rendered.body,
        data: outbox.data ?? {},
        destination: Array.isArray(destination) ? null : destination,
        status: NOTIFICATION_STATUS.QUEUED,
        eventName: outbox.eventName,
        outboxId: entityId(outbox),
        dedupeKey: outbox.dedupeKey,
        scheduledAt: outbox.scheduledAt ?? null,
      });
    } catch (err) {
      if (err?.code === 11000) return null; // (dedupeKey, channel) already exists
      throw err;
    }
  }

  // ==================== CUSTOMER INBOX ====================

  #recipientFilter(recipientScope) {
    return recipientScope.userId ? { userId: recipientScope.userId } : { sessionId: recipientScope.sessionId };
  }

  async listInbox(recipientScope, query = {}) {
    const page = await this.notifications.paginateInbox(this.#recipientFilter(recipientScope), {
      filter: query.status ? { status: query.status } : {},
      pagination: { page: query.page, limit: query.limit },
    });
    const unread = await this.notifications.countUnread(this.#recipientFilter(recipientScope));
    const dto = this.paginated(page, toInboxDTO);
    return { ...dto, unread };
  }

  async markRead(recipientScope, id) {
    const n = await this.notifications.findById(id);
    if (!n || n.channel !== CHANNEL.IN_APP) throw new NotFoundError(NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
    const owns = recipientScope.userId ? String(n.userId) === recipientScope.userId : String(n.sessionId) === recipientScope.sessionId;
    if (!owns) throw new ForbiddenError(NOTIFICATION_ERRORS.CROSS_TENANT);
    if (n.status === NOTIFICATION_STATUS.READ) return toInboxDTO(n);
    const updated = await this.notifications.updateById(id, { status: NOTIFICATION_STATUS.READ, readAt: new Date() });
    await this.events.publish(new NotificationReadEvent({ notificationId: id, restaurantId: String(n.restaurantId), userId: n.userId ? String(n.userId) : null }));
    this.realtime.emitRead(updated);
    return toInboxDTO(updated);
  }

  async markAllRead(recipientScope) {
    return this.notifications.markAllRead(this.#recipientFilter(recipientScope));
  }

  // ==================== STAFF / ADMIN ====================

  async listForStaff(tenant, restaurantId, query = {}) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const filter = {};
    for (const f of ['status', 'category', 'channel', 'audience']) if (query[f]) filter[f] = query[f];
    const page = await this.notifications.paginateForStaff(scope, {
      filter,
      search: query.search,
      sort: query.sort ?? '-createdAt',
      pagination: { page: query.page, limit: query.limit },
    });
    return this.paginated(page, (n) => toNotificationDTO(n, { forStaff: true }));
  }

  async getForStaff(tenant, id) {
    const n = await loadForStaff(this.notifications, tenant, id, NOTIFICATION_ERRORS.NOTIFICATION_NOT_FOUND);
    const attempts = await this.attempts.findByNotification(entityId(n));
    return { ...toNotificationDTO(n, { forStaff: true }), attempts: attempts.map(toDeliveryAttemptDTO) };
  }

  /** Staff-initiated manual/test send (bypasses the outbox — synchronous action). */
  async testSend(tenant, restaurantId, { channel, templateKey, to, variables = {} }, actorId = null) {
    const scope = await this.resolveScope(tenant, restaurantId);
    const rendered = await this.templates.render(scope, templateKey, channel, variables.locale ?? DEFAULT_LOCALE, variables);
    const notification = await this.notifications.createScoped(scope, {
      audience: 'staff',
      channel,
      category: 'system',
      templateKey,
      subject: rendered.subject,
      body: rendered.body,
      destination: channel === CHANNEL.IN_APP ? null : to,
      status: NOTIFICATION_STATUS.QUEUED,
      eventName: 'manual.test',
      dedupeKey: dedupeKey('manual.test', to ?? actorId ?? 'staff', `${Date.now()}:${channel}`),
    });
    await this.enqueue(entityId(notification));
    this.audit.success('notification.manual_send', { actorId, targetId: entityId(notification), metadata: { channel, templateKey } });
    return toNotificationDTO(notification, { forStaff: true });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
