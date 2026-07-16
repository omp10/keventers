/**
 * Socket.IO platform — public barrel.
 */
export { socketServer, SocketServer } from './socket-server.js';
export { createSocketAuth, setSocketGuestVerifier } from './socket-auth.js';
export { registerSocketRoomGuard } from './room-guards.js';
export { namespaceRegistry, NamespaceRegistry } from './namespace-registry.js';
export { socketEventRegistry, SocketEventRegistry } from './event-registry.js';
export { RoomManager, Rooms } from './room.manager.js';
export { attachRedisAdapter } from './redis-adapter.js';
