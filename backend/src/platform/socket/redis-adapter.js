import { createAdapter } from '@socket.io/redis-adapter';

import { redisConnection } from '#core/redis/redis.connection.js';
import { logger } from '#core/logging/logger.js';

/**
 * Redis adapter abstraction for Socket.IO. Enables horizontal scaling: events
 * emitted on one instance reach clients connected to any instance. Uses
 * duplicated pub/sub clients from the shared Redis connection.
 *
 * @param {import('socket.io').Server} io
 */
export async function attachRedisAdapter(io) {
  const base = redisConnection.getClient();
  const pubClient = base.duplicate();
  const subClient = base.duplicate();

  await Promise.all([
    pubClient.status === 'ready' ? Promise.resolve() : pubClient.connect(),
    subClient.status === 'ready' ? Promise.resolve() : subClient.connect(),
  ]);

  io.adapter(createAdapter(pubClient, subClient));
  logger().info('Socket.IO Redis adapter attached');

  return { pubClient, subClient };
}

export default attachRedisAdapter;
