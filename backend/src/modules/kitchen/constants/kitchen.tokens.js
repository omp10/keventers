/**
 * Module-local DI tokens for the Kitchen (KDS) module. Future modules
 * (Analytics, Notifications, Payments) consume KITCHEN EVENTS rather than
 * resolving these services directly.
 */
export const KITCHEN_TOKENS = Object.freeze({
  QueueRepository: Symbol('kitchen.QueueRepository'),
  StationRepository: Symbol('kitchen.StationRepository'),
  SlaRepository: Symbol('kitchen.SlaRepository'),

  QueueStore: Symbol('kitchen.QueueStore'),

  KitchenService: Symbol('kitchen.KitchenService'),
  StationService: Symbol('kitchen.StationService'),
  StationRouter: Symbol('kitchen.StationRouter'),
  SlaService: Symbol('kitchen.SlaService'),
  ChefAssignmentService: Symbol('kitchen.ChefAssignmentService'),
  KitchenRealtimeService: Symbol('kitchen.KitchenRealtimeService'),
});

export default KITCHEN_TOKENS;
