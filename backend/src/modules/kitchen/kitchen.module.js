import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';

import { KITCHEN_PERMISSIONS } from './constants/kitchen.constants.js';
import { KITCHEN_TOKENS } from './constants/kitchen.tokens.js';
import { registerKitchenEventHandlers } from './events/handlers.js';
import { kitchenQueueRepository } from './repositories/kitchen-queue.repository.js';
import { kitchenSlaRepository } from './repositories/kitchen-sla.repository.js';
import { kitchenStationRepository } from './repositories/kitchen-station.repository.js';
import kitchenRouter from './routes/index.js';
import { chefAssignmentService } from './services/chef-assignment.service.js';
import { kitchenRealtimeService } from './services/kitchen-realtime.service.js';
import { kitchenService } from './services/kitchen.service.js';
import { slaService } from './services/sla.service.js';
import { stationRouterService } from './services/station-router.service.js';
import { stationService } from './services/station.service.js';
import { kitchenQueueStore } from './stores/kitchen-queue.store.js';

/**
 * Kitchen Display System (KDS) module composition. An event-driven operational
 * system: it CONSUMES Order events (enqueue on confirm, cancel on order-cancel)
 * and communicates outward only through kitchen events + Socket.IO — never
 * writing back to the Order module. Mounted at the API v1 root (basePath '/')
 * with specific `/restaurant/kitchen` + `/admin/kitchen` paths; registered
 * BEFORE the organization module so those paths win.
 */
export const kitchenModule = {
  name: 'kitchen',
  basePath: '/',
  router: kitchenRouter,

  registerDependencies(container = sharedContainer) {
    container.register(KITCHEN_TOKENS.QueueRepository, kitchenQueueRepository);
    container.register(KITCHEN_TOKENS.StationRepository, kitchenStationRepository);
    container.register(KITCHEN_TOKENS.SlaRepository, kitchenSlaRepository);
    container.register(KITCHEN_TOKENS.QueueStore, kitchenQueueStore);
    container.register(KITCHEN_TOKENS.KitchenService, kitchenService);
    container.register(KITCHEN_TOKENS.StationService, stationService);
    container.register(KITCHEN_TOKENS.StationRouter, stationRouterService);
    container.register(KITCHEN_TOKENS.SlaService, slaService);
    container.register(KITCHEN_TOKENS.ChefAssignmentService, chefAssignmentService);
    container.register(KITCHEN_TOKENS.KitchenRealtimeService, kitchenRealtimeService);
  },

  bootstrapRbac() {
    permissionRegistry.registerMany(Object.values(KITCHEN_PERMISSIONS));
  },

  registerEventHandlers(eventBus = sharedEventBus) {
    registerKitchenEventHandlers(eventBus);
  },

  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.bootstrapRbac();
    this.registerEventHandlers(eventBus);
    logger().info({ module: this.name }, 'Kitchen (KDS) module registered');
    return this;
  },
};

export default kitchenModule;
