import { config } from '#config';
import { logger } from '#core/logging/logger.js';
import { socketServer } from '#platform/socket/index.js';

import {
  connectInfrastructure,
  disconnectInfrastructure,
  registerApplicationModules,
  registerCoreDependencies,
} from './bootstrap/runtime.js';
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

async function bootstrap() {
  logger().info({ env: config.server.env }, 'Starting Keventers backend');

  await connectInfrastructure();
  registerCoreDependencies();
  registerApplicationModules();

  const app = createApp();
  httpServer = app.listen(config.server.port, config.server.host, () => {
    logger().info(
      { host: config.server.host, port: config.server.port },
      `Server listening on http://${config.server.host}:${config.server.port}`,
    );
    if (typeof process.send === 'function') process.send('ready');
  });

  await socketServer.init(httpServer);
  registerProcessHandlers();
}

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger().info({ signal }, 'Graceful shutdown initiated');

  const forceExit = setTimeout(() => {
    logger().error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, config.server.shutdownTimeoutMs);
  forceExit.unref();

  try {
    if (httpServer) {
      await new Promise((resolve, reject) =>
        httpServer.close((err) => (err ? reject(err) : resolve())),
      );
      logger().info('HTTP server closed');
    }

    await socketServer.close();
    await disconnectInfrastructure();

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
