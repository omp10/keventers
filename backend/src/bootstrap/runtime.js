import { config } from '#config';
import { cacheService } from '#core/cache/cache.service.js';
import { distributedLock } from '#core/cache/distributed-lock.js';
import { rateLimitStore } from '#core/cache/rate-limit.store.js';
import { mongoConnection } from '#core/database/mongoose.connection.js';
import { container } from '#core/di/container.js';
import { TOKENS } from '#core/di/tokens.js';
import { eventBus } from '#core/eventbus/index.js';
import { healthService } from '#core/health/health.service.js';
import { logger } from '#core/logging/logger.js';
import { metrics } from '#core/observability/metrics.js';
import { redisConnection } from '#core/redis/redis.connection.js';
import {
  passwordService,
  policyEvaluator,
  sessionService,
  tokenGenerationService,
  tokenVerificationService,
} from '#platform/auth/index.js';
import { jobManager } from '#platform/jobs/index.js';
import { notificationService } from '#platform/notification/index.js';
import { socketServer } from '#platform/socket/index.js';
import { getStorage } from '#platform/storage/index.js';
import { registerModules } from '#modules/index.js';

export async function connectInfrastructure() {
  await mongoConnection.connect();
  await redisConnection.connect();
}

export function registerCoreDependencies() {
  container.register(TOKENS.Config, config);
  container.register(TOKENS.Logger, logger);
  container.register(TOKENS.MongoConnection, mongoConnection);
  container.register(TOKENS.RedisClient, redisConnection);
  container.register(TOKENS.HealthService, healthService);

  container.register(TOKENS.EventBus, eventBus);
  container.register(TOKENS.CacheService, cacheService);
  container.register(TOKENS.DistributedLock, distributedLock);
  container.register(TOKENS.RateLimitStore, rateLimitStore);

  container.register(TOKENS.PasswordService, passwordService);
  container.register(TOKENS.TokenGenerationService, tokenGenerationService);
  container.register(TOKENS.TokenVerificationService, tokenVerificationService);
  container.register(TOKENS.SessionService, sessionService);
  container.register(TOKENS.PolicyEvaluator, policyEvaluator);

  container.register(TOKENS.StorageProvider, getStorage());
  container.register(TOKENS.NotificationService, notificationService);
  container.register(TOKENS.JobManager, jobManager);
  container.register(TOKENS.SocketServer, socketServer);
  container.register(TOKENS.Metrics, metrics);
}

export function registerApplicationModules() {
  registerModules({ container, eventBus });
}

export async function disconnectInfrastructure() {
  await Promise.allSettled([mongoConnection.disconnect(), redisConnection.disconnect()]);
}
