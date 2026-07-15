import { DomainEvent } from '#core/eventbus/index.js';

/**
 * Analytics domain events (PUBLISHED). Ops tooling / future modules can react to
 * projection updates + rebuild lifecycle. Reconciliation failures are surfaced as
 * an event so alerting can hook in without polling.
 */
export const ANALYTICS_EVENTS = Object.freeze({
  PROJECTION_UPDATED: 'analytics.projection_updated',
  REBUILD_STARTED: 'analytics.rebuild_started',
  REBUILD_COMPLETED: 'analytics.rebuild_completed',
  RECONCILIATION_FAILED: 'analytics.reconciliation_failed',
});

const ev = (name) =>
  class extends DomainEvent {
    static eventName = name;
  };

export const AnalyticsProjectionUpdatedEvent = ev(ANALYTICS_EVENTS.PROJECTION_UPDATED);
export const AnalyticsRebuildStartedEvent = ev(ANALYTICS_EVENTS.REBUILD_STARTED);
export const AnalyticsRebuildCompletedEvent = ev(ANALYTICS_EVENTS.REBUILD_COMPLETED);
export const AnalyticsReconciliationFailedEvent = ev(ANALYTICS_EVENTS.RECONCILIATION_FAILED);
