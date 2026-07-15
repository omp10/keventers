import { getContext } from '#core/logging/request-context.js';
import { logger } from '#core/logging/logger.js';

/**
 * Audit-logging foundation. Emits structured, tamper-evident-friendly audit
 * records for security/compliance-relevant actions (auth events, permission
 * changes, sensitive mutations). This is the reusable sink; WHICH actions are
 * audited is decided by business modules later.
 *
 * Records are emitted on a dedicated logger channel (audit: true) so they can
 * be routed to a separate store/stream in production.
 *
 * @typedef {object} AuditEntry
 * @property {string} action     e.g. "auth.login", "user.role.updated"
 * @property {string} [actorId]  Who performed it.
 * @property {string} [targetId] What was acted upon.
 * @property {'success'|'failure'} [outcome]
 * @property {Record<string, unknown>} [metadata]
 */
export const AuditLog = {
  /** @param {AuditEntry} entry */
  record(entry) {
    const { correlationId, requestId, userId } = getContext();
    logger({ audit: true }).info(
      {
        audit: {
          ...entry,
          actorId: entry.actorId ?? userId ?? null,
          outcome: entry.outcome ?? 'success',
          correlationId,
          requestId,
          at: new Date().toISOString(),
        },
      },
      `audit:${entry.action}`,
    );
  },
};

export default AuditLog;
