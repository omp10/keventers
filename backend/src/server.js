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

import { createApp } from './app.js';

/**
 * COMPOSITION ROOT.
 *
 * The single place that knows concrete implementations: it connects
 * infrastructure, registers dependencies in the DI container, builds the app,
 * starts the HTTP server, and wires graceful shutdown. Nothing else in the
 * codebase performs process-level wiring.
 */

let httpServer;
let isShuttingDown = false;

/** Register core + platform singletons so modules resolve them from the container. */
function registerCoreDependencies() {
  // Infrastructure
  container.register(TOKENS.Config, config);
  container.register(TOKENS.Logger, logger);
  container.register(TOKENS.MongoConnection, mongoConnection);
  container.register(TOKENS.RedisClient, redisConnection);
  container.register(TOKENS.HealthService, healthService);

  // Events & cache
  container.register(TOKENS.EventBus, eventBus);
  container.register(TOKENS.CacheService, cacheService);
  container.register(TOKENS.DistributedLock, distributedLock);
  container.register(TOKENS.RateLimitStore, rateLimitStore);

  // Auth
  container.register(TOKENS.PasswordService, passwordService);
  container.register(TOKENS.TokenGenerationService, tokenGenerationService);
  container.register(TOKENS.TokenVerificationService, tokenVerificationService);
  container.register(TOKENS.SessionService, sessionService);
  container.register(TOKENS.PolicyEvaluator, policyEvaluator);

  // Subsystems
  container.register(TOKENS.StorageProvider, getStorage());
  container.register(TOKENS.NotificationService, notificationService);
  container.register(TOKENS.JobManager, jobManager);
  container.register(TOKENS.SocketServer, socketServer);
  container.register(TOKENS.Metrics, metrics);
}

async function bootstrap() {
  logger().info({ env: config.server.env }, 'Starting Keventers backend');

  // 1. Connect infrastructure first — fail fast if unreachable.
  await mongoConnection.connect();
  await redisConnection.connect();

  // 2. Wire the container.
  registerCoreDependencies();

  // 2b. Register business modules (DI providers, RBAC seed, event handlers).
  registerModules({ container, eventBus });

  // 3. Build the HTTP app and listen.
  const app = createApp();
  httpServer = app.listen(config.server.port, config.server.host, () => {
    logger().info(
      { host: config.server.host, port: config.server.port },
      `Server listening on http://${config.server.host}:${config.server.port}`,
    );
    // Signal PM2 (wait_ready) that the app is ready to receive traffic.
    if (typeof process.send === 'function') process.send('ready');
  });

  // 4. Initialize the Socket.IO platform on the same HTTP server.
  await socketServer.init(httpServer);

  // 5. Start background-job workers (none registered yet → no-op, but ready).
  jobManager.start();

  registerProcessHandlers();
}

/**
 * Gracefully close the HTTP server then infrastructure connections, bounded by
 * a hard timeout so a stuck connection can never block shutdown forever.
 * @param {string} signal
 * @param {number} [exitCode]
 */
async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger().info({ signal }, 'Graceful shutdown initiated');

  const forceExit = setTimeout(() => {
    logger().error('Shutdown timed out — forcing exit');
    process.exit(1);
  }, config.server.shutdownTimeoutMs);
  forceExit.unref();

  try {
    // 1. Stop accepting new connections; drain in-flight requests.
    if (httpServer) {
      await new Promise((resolve, reject) =>
        httpServer.close((err) => (err ? reject(err) : resolve())),
      );
      logger().info('HTTP server closed');
    }

    // 2. Close platform subsystems (sockets, job workers) before infra.
    await Promise.allSettled([socketServer.close(), jobManager.stop()]);

    // 3. Close infrastructure connections.
    await Promise.allSettled([mongoConnection.disconnect(), redisConnection.disconnect()]);

    clearTimeout(forceExit);
    logger().info('Graceful shutdown complete');
    process.exit(exitCode);
  } catch (err) {
    logger().error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

function registerProcessHandlers() {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger().error({ err: reason }, 'Unhandled promise rejection');
    shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (err) => {
    logger().fatal({ err }, 'Uncaught exception');
    shutdown('uncaughtException', 1);
  });
}

bootstrap().catch((err) => {
  logger().fatal({ err }, 'Fatal error during startup');
  process.exit(1);
});
