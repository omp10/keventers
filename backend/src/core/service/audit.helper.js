import { AuditLog } from '#core/observability/audit-log.js';

/**
 * Service-layer audit facade. Business services call `audit.record(...)` for
 * compliance-relevant actions; the underlying sink is swappable.
 */
export const AuditHelper = {
  record: AuditLog.record,

  success(action, extra = {}) {
    AuditLog.record({ action, outcome: 'success', ...extra });
  },

  failure(action, extra = {}) {
    AuditLog.record({ action, outcome: 'failure', ...extra });
  },
};

export default AuditHelper;
