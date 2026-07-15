import { logger } from '#core/logging/logger.js';

import { ORG_EVENTS } from './organization.events.js';

/**
 * Intra-module event subscribers. Cross-cutting reactions to lifecycle events
 * WITHOUT coupling — a future notification module would subscribe to these
 * independently. Kept light here (observability); transactional side effects
 * live in the services.
 *
 * @param {import('#core/eventbus/event-bus.interface.js').IEventBus} eventBus
 */
export function registerOrganizationEventHandlers(eventBus) {
  const log = logger({ module: 'organization', component: 'event-handlers' });

  const observe = (event, msg) =>
    eventBus.subscribe(event, async (payload) => log.info({ payload }, msg), {
      name: `organization.log.${event}`,
    });

  observe(ORG_EVENTS.ORGANIZATION_REGISTERED, 'application received');
  observe(ORG_EVENTS.ORGANIZATION_APPROVED, 'organization approved');
  observe(ORG_EVENTS.ORGANIZATION_REJECTED, 'organization rejected');
  observe(ORG_EVENTS.ORGANIZATION_ACTIVATED, 'organization activated');
  observe(ORG_EVENTS.ONBOARDING_COMPLETED, 'restaurant onboarding completed');
}

export default registerOrganizationEventHandlers;
