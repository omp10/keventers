/**
 * Kitchen (KDS) module — PUBLIC BARREL. Future modules (Analytics, Notifications,
 * Payments) CONSUME kitchen EVENTS from here rather than calling the service.
 */
export { kitchenModule } from './kitchen.module.js';

// Service singletons.
export { kitchenService } from './services/kitchen.service.js';
export { stationService } from './services/station.service.js';
export { slaService } from './services/sla.service.js';

// DI tokens.
export { KITCHEN_TOKENS } from './constants/kitchen.tokens.js';

// Domain events + names other modules subscribe to.
export * from './events/kitchen.events.js';

// Auto-assignment strategy contract (extension point).
export {
  AutoAssignmentStrategy,
  RoundRobinAssignmentStrategy,
} from './interfaces/assignment-strategy.interface.js';

// Public constants.
export {
  KITCHEN_STATUS,
  KITCHEN_TRANSITIONS,
  STATION_TYPE,
  PRIORITY,
  KITCHEN_PERMISSIONS,
} from './constants/kitchen.constants.js';

// Seeder.
export { kitchenSeeder, KitchenSeeder } from './seeds/kitchen.seeder.js';
