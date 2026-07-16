import { config } from '#config';
import { logger } from '#core/logging/logger.js';
import { jobManager } from '#platform/jobs/index.js';

import {
  connectInfrastructure,
  disconnectInfrastructure,
  registerApplicationModules,
  registerCoreDependencies,
} from './bootstrap/runtime.js';

let isShuttingDown = false;

async function bootstrap() {
  logger().info({ env: config.server.env }, 'Starting Keventers worker');

  await connectInfrastructure();
  registerCoreDependencies();
  registerApplicationModules();
  jobManager.start();

  if (typeof process.send === 'function') process.send('ready');
}

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger().info({ signal }, 'Worker graceful shutdown initiated');

  const forceExit = setTimeout(() => {
    logger().error('Worker shutdown timed out, forcing exit');
    process.exit(1);
  }, config.server.shutdownTimeoutMs);
  forceExit.unref();

  try {
    await jobManager.stop();
    await disconnectInfrastructure();
    clearTimeout(forceExit);
    logger().info('Worker graceful shutdown complete');
    process.exit(exitCode);
  } catch (err) {
    logger().error({ err }, 'Error during worker shutdown');
    process.exit(1);
  }
}

function registerProcessHandlers() {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger().error({ err: reason }, 'Unhandled promise rejection in worker');
    shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (err) => {
    logger().fatal({ err }, 'Uncaught exception in worker');
    shutdown('uncaughtException', 1);
  });
}

registerProcessHandlers();

bootstrap().catch((err) => {
  logger().fatal({ err }, 'Fatal error during worker startup');
  process.exit(1);
});
