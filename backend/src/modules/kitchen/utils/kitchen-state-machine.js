import { BadRequestError } from '#core/errors/app-error.js';

import {
  ACTIVE_KITCHEN_STATUSES,
  ACTOR_TYPE,
  KITCHEN_ERRORS,
  KITCHEN_TRANSITIONS,
  TERMINAL_KITCHEN_STATUSES,
} from '../constants/kitchen.constants.js';

/**
 * Kitchen workflow state machine — pure functions that validate transitions and
 * build immutable timeline entries. The service applies these; controllers
 * never move status directly.
 */
export function canTransition(from, to) {
  return (KITCHEN_TRANSITIONS[from] ?? []).includes(to);
}

export function assertTransition(from, to) {
  if (from === to) return;
  if (!canTransition(from, to)) {
    throw new BadRequestError(`${KITCHEN_ERRORS.INVALID_TRANSITION}: ${from} → ${to}`);
  }
}

export function isTerminal(status) {
  return TERMINAL_KITCHEN_STATUSES.includes(status);
}

export function isActive(status) {
  return ACTIVE_KITCHEN_STATUSES.includes(status);
}

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
