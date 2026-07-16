import { Server } from 'socket.io';

import { config } from '#config';
import { logger } from '#core/logging/logger.js';

import { createSocketAuth } from './socket-auth.js';
import { isGuestRoomAllowed } from './room-guards.js';
import { namespaceRegistry } from './namespace-registry.js';
import { attachRedisAdapter } from './redis-adapter.js';
import { RoomManager, Rooms } from './room.manager.js';
import { socketEventRegistry } from './event-registry.js';

/**
 * Socket.IO platform bootstrap. Attaches to the existing HTTP server, wires the
 * Redis adapter (for multi-instance scaling), and materializes every registered
 * namespace with authentication + registered connection initializers.
 *
 * This is the reusable foundation ONLY — no business events are emitted or
 * handled here.
 */
export class SocketServer {
  /** @type {import('socket.io').Server | null} */
  io = null;
  /** @type {{ pubClient: object, subClient: object } | null} adapter pub/sub clients (closed on shutdown) */
  #adapterClients = null;

  async init(httpServer) {
    this.io = new Server(httpServer, {
      path: config.socket.path,
      cors: { origin: config.socket.corsOrigin, credentials: true },
    });

    if (config.socket.useRedisAdapter) {
      try {
        this.#adapterClients = await attachRedisAdapter(this.io);
      } catch (err) {
        logger().error({ err }, 'Failed to attach Socket.IO Redis adapter (continuing single-node)');
      }
    }

    for (const { path, requireAuth } of namespaceRegistry.list()) {
      const nsp = this.io.of(path);
      nsp.use(createSocketAuth({ required: requireAuth }));

      nsp.on('connection', (socket) => {
        const principal = socket.data.principal;
        // Auto-join the per-user room so modules can target a user's devices.
        if (principal?.id) socket.join(Rooms.user(principal.id));

        // Room membership protocol — the client half already speaks this
        // (`socketClient.joinRoom` emits `room:join` and re-joins on reconnect);
        // this is the server half. Authorization: staff principals may join any
        // tenant room (their token already gates the data behind those events);
        // guest principals are confined to rooms of THEIR session's order scope
        // via the registered guard. Room names are validated to `type:id`.
        const canJoin = async (room) => {
          if (typeof room !== 'string' || !/^[a-z-]+:[\w-]+$/i.test(room) || room.length > 128) return false;
          if (principal?.guest) return isGuestRoomAllowed(room, principal.guest);
          return Boolean(principal?.authenticated);
        };
        socket.on('room:join', async ({ room } = {}) => {
          if (await canJoin(room)) socket.join(room);
          else logger().debug({ room, socketId: socket.id }, 'Socket room join rejected');
        });
        socket.on('room:leave', ({ room } = {}) => {
          if (typeof room === 'string') socket.leave(room);
        });

        logger().debug({ nsp: path, socketId: socket.id, userId: principal?.id }, 'Socket connected');
        socketEventRegistry.applyTo(path, socket, nsp);

        socket.on('disconnect', (reason) =>
          logger().debug({ socketId: socket.id, reason }, 'Socket disconnected'),
        );
      });
    }

    logger().info({ path: config.socket.path }, 'Socket.IO server initialized');
    return this.io;
  }

  /** RoomManager bound to a namespace (default root) for emitting from services. */
  rooms(namespace = '/') {
    if (!this.io) throw new Error('Socket server not initialized');
    return new RoomManager(this.io.of(namespace));
  }

  async close() {
    if (this.io) {
      await this.io.close();
      logger().info('Socket.IO server closed');
    }
    // The adapter's duplicated pub/sub connections are independent of the shared
    // Redis client, so quit them explicitly or they leak on shutdown.
    if (this.#adapterClients) {
      await Promise.allSettled([
        this.#adapterClients.pubClient?.quit?.(),
        this.#adapterClients.subClient?.quit?.(),
      ]);
      this.#adapterClients = null;
    }
  }
}

export const socketServer = new SocketServer();
export default socketServer;
