/**
 * Notification DTO mappers. Internal Mongoose fields never leak; ids are strings.
 * Provider secrets are never present on these models, so nothing sensitive is
 * exposed. Customer-facing inbox DTOs omit delivery internals.
 */
const id = (doc) => (doc?._id ? String(doc._id) : (doc?.id ?? null));
const oid = (v) => (v == null ? null : String(v));

export function toInboxDTO(n) {
  if (!n) return null;
  return {
    id: id(n),
    category: n.category,
    priority: n.priority,
    title: n.subject ?? null,
    body: n.body ?? '',
    data: n.data ?? {},
    status: n.status,
    read: n.status === 'read',
    createdAt: n.createdAt ?? null,
    readAt: n.readAt ?? null,
  };
}

export function toNotificationDTO(n, { forStaff = false } = {}) {
  if (!n) return null;
  const base = toInboxDTO(n);
  if (!forStaff) return base;
  return {
    ...base,
    channel: n.channel,
    templateKey: n.templateKey ?? null,
    audience: n.audience,
    userId: oid(n.userId),
    customerId: oid(n.customerId),
    sessionId: n.sessionId ?? null,
    destination: n.destination ?? null,
    provider: n.provider ?? null,
    providerMessageId: n.providerMessageId ?? null,
    failureReason: n.failureReason ?? null,
    attemptCount: n.attemptCount ?? 0,
    eventName: n.eventName ?? null,
    sentAt: n.sentAt ?? null,
    deliveredAt: n.deliveredAt ?? null,
    failedAt: n.failedAt ?? null,
  };
}

export function toTemplateDTO(t) {
  if (!t) return null;
  return {
    id: id(t),
    scope: t.restaurantId ? 'restaurant' : t.organizationId ? 'organization' : 'global',
    organizationId: oid(t.organizationId),
    restaurantId: oid(t.restaurantId),
    key: t.key,
    channel: t.channel,
    locale: t.locale,
    category: t.category,
    subject: t.subject ?? null,
    body: t.body,
    variables: t.variables ?? [],
    version: t.version ?? 1,
    isActive: t.isActive !== false,
    updatedAt: t.updatedAt ?? null,
  };
}

export function toPreferenceDTO(p) {
  if (!p) return null;
  return {
    userId: oid(p.userId),
    categories: p.categories ?? {},
    hasDeviceTokens: (p.deviceTokens ?? []).length > 0,
    mutedUntil: p.mutedUntil ?? null,
  };
}

export function toDeliveryAttemptDTO(a) {
  if (!a) return null;
  return {
    id: id(a),
    notificationId: oid(a.notificationId),
    channel: a.channel,
    provider: a.provider,
    attemptNumber: a.attemptNumber,
    status: a.status,
    providerMessageId: a.providerMessageId ?? null,
    failureReason: a.failureReason ?? null,
    durationMs: a.durationMs ?? null,
    createdAt: a.createdAt ?? null,
  };
}

export function toOutboxDTO(o) {
  if (!o) return null;
  return {
    id: id(o),
    eventName: o.eventName,
    templateKey: o.templateKey,
    category: o.category,
    status: o.status,
    attempts: o.attempts ?? 0,
    lastError: o.lastError ?? null,
    dispatchedAt: o.dispatchedAt ?? null,
    createdAt: o.createdAt ?? null,
  };
}

export function toCampaignDTO(c) {
  if (!c) return null;
  return {
    id: id(c),
    name: c.name,
    description: c.description ?? null,
    category: c.category,
    channels: c.channels ?? [],
    templateKey: c.templateKey,
    segment: c.segment ?? {},
    status: c.status,
    scheduledAt: c.scheduledAt ?? null,
    stats: c.stats ?? {},
    createdAt: c.createdAt ?? null,
  };
}
