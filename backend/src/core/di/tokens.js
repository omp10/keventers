/**
 * Injection tokens (symbols) for the DI container. Using symbols avoids
 * stringly-typed collisions and gives a single registry of wireable
 * dependencies. Business modules will add their own tokens in later phases.
 */
export const TOKENS = Object.freeze({
  // Infrastructure
  Config: Symbol('Config'),
  Logger: Symbol('Logger'),
  MongoConnection: Symbol('MongoConnection'),
  RedisClient: Symbol('RedisClient'),
  HealthService: Symbol('HealthService'),

  // Platform — events & cache
  EventBus: Symbol('EventBus'),
  CacheService: Symbol('CacheService'),
  DistributedLock: Symbol('DistributedLock'),
  RateLimitStore: Symbol('RateLimitStore'),

  // Platform — auth
  PasswordService: Symbol('PasswordService'),
  TokenGenerationService: Symbol('TokenGenerationService'),
  TokenVerificationService: Symbol('TokenVerificationService'),
  SessionService: Symbol('SessionService'),
  RoleRegistry: Symbol('RoleRegistry'),
  PermissionRegistry: Symbol('PermissionRegistry'),
  PolicyEvaluator: Symbol('PolicyEvaluator'),

  // Platform — subsystems
  StorageProvider: Symbol('StorageProvider'),
  NotificationService: Symbol('NotificationService'),
  JobManager: Symbol('JobManager'),
  SocketServer: Symbol('SocketServer'),
  Metrics: Symbol('Metrics'),
});
