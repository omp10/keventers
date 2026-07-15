import { logger } from '#core/logging/logger.js';

import { IDENTITY_EVENTS } from './identity.events.js';

/**
 * Intra-module event subscribers (extension points). These react to identity
 * events for cross-cutting concerns WITHOUT coupling modules — e.g. a future
 * notification module would subscribe to PASSWORD_RESET_REQUESTED separately.
 *
 * Registered from identity.module.js against the shared event bus. Kept
 * deliberately light in this phase (observability only); side effects that must
 * be transactional live in the services themselves.
 *
 * @param {import('#core/eventbus/event-bus.interface.js').IEventBus} eventBus
 */
export function registerIdentityEventHandlers(eventBus) {
  const log = logger({ module: 'identity', component: 'event-handlers' });

  eventBus.subscribe(
    IDENTITY_EVENTS.USER_CREATED,
    async (payload) => log.info({ userId: payload.userId }, 'user created'),
    { name: 'identity.log.userCreated' },
  );

  eventBus.subscribe(
    IDENTITY_EVENTS.PASSWORD_RESET_REQUESTED,
    async (payload) =>
      // A notification module will consume this to deliver the reset token.
      log.info({ userId: payload.userId }, 'password reset requested'),
    { name: 'identity.log.passwordResetRequested' },
  );

  eventBus.subscribe(
    IDENTITY_EVENTS.SESSION_REVOKED,
    async (payload) => log.info({ userId: payload.userId, scope: payload.scope }, 'session revoked'),
    { name: 'identity.log.sessionRevoked' },
  );
}

export default registerIdentityEventHandlers;
