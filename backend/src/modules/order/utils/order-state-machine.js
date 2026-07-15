import { BadRequestError } from '#core/errors/app-error.js';

import {
  ACTOR_TYPE,
  ORDER_ERRORS,
  ORDER_STATUS,
  ORDER_TRANSITIONS,
  TERMINAL_STATUSES,
} from '../constants/order.constants.js';

/**
 * Order state machine — the invariant-protecting core of the Order Aggregate.
 * Pure functions: they validate transitions and build immutable timeline
 * entries. The service applies these; controllers never touch status directly.
 */

/** Is `to` a legal transition from `from`? */
export function canTransition(from, to) {
  return (ORDER_TRANSITIONS[from] ?? []).includes(to);
}

/** Throw a domain error if the transition is illegal. */
export function assertTransition(from, to) {
  if (from === to) return; // idempotent no-op guard handled by caller
  if (!canTransition(from, to)) {
    throw new BadRequestError(`${ORDER_ERRORS.INVALID_TRANSITION}: ${from} → ${to}`);
  }
}

export function isTerminal(status) {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Build an immutable timeline entry for a transition.
 * @param {object} params
 * @param {string} params.previousStatus
 * @param {string} params.newStatus
 * @param {string|null} [params.actorId]
 * @param {string} [params.actorType]
 * @param {string} [params.reason]
 * @param {object} [params.metadata]
 * @param {Date} [params.at]
 */
export function timelineEntry({
  previousStatus,
  newStatus,
  actorId = null,
  actorType = ACTOR_TYPE.SYSTEM,
  reason = '',
  metadata = {},
  at = new Date(),
}) {
  return { at, actorId, actorType, previousStatus, newStatus, reason, metadata };
}

/** The initial timeline for a freshly-placed order (CREATED → PLACED). */
export function initialTimeline({ actorId, actorType, at = new Date() }) {
  return [
    timelineEntry({ previousStatus: null, newStatus: ORDER_STATUS.CREATED, actorId, actorType, at }),
    timelineEntry({ previousStatus: ORDER_STATUS.CREATED, newStatus: ORDER_STATUS.PLACED, actorId, actorType, at }),
  ];
}
