/**
 * Room helpers. Provides consistent room-naming conventions and emit helpers so
 * modules don't hand-roll room strings. Business rooms (e.g. order rooms) are
 * NOT defined here — only the reusable primitives.
 */
export const Rooms = {
  /** Per-user room — target a specific user across all their sockets. */
  user(userId) {
    return `user:${userId}`;
  },

  /** Arbitrary entity room, e.g. entity('outlet', id). */
  entity(type, id) {
    return `${type}:${id}`;
  },
};

export class RoomManager {
  /** @param {import('socket.io').Namespace|import('socket.io').Server} nsp */
  constructor(nsp) {
    this.nsp = nsp;
  }

  join(socket, room) {
    return socket.join(room);
  }

  leave(socket, room) {
    return socket.leave(room);
  }

  /** Emit an event to everyone in a room. */
  emitToRoom(room, event, payload) {
    this.nsp.to(room).emit(event, payload);
  }

  /** Emit to a specific user's room (all their devices). */
  emitToUser(userId, event, payload) {
    this.nsp.to(Rooms.user(userId)).emit(event, payload);
  }
}

export default RoomManager;
