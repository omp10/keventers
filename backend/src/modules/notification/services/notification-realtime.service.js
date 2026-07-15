import { BaseService } from '#core/service/base.service.js';
import { Rooms, socketServer } from '#platform/socket/index.js';

/**
 * Realtime in-app delivery over Socket.IO. Pushes new in-app notifications and
 * read receipts to the recipient's user/session room so open clients update
 * live. BEST-EFFORT: no-ops if the socket server isn't initialized; never blocks
 * or fails a delivery. Payloads are non-secret.
 */
export class NotificationRealtimeService extends BaseService {
  constructor({ socket = socketServer, eventBus } = {}) {
    super({ name: 'notification.realtime', eventBus });
    this.socket = socket;
  }

  #rooms() {
    if (!this.socket?.io) return null;
    try {
      return this.socket.rooms('/');
    } catch {
      return null;
    }
  }

  emitNew(notification) {
    const rooms = this.#rooms();
    if (!rooms) return;
    const payload = {
      id: notification.id ?? (notification._id ? String(notification._id) : null),
      category: notification.category,
      title: notification.subject ?? null,
      body: notification.body ?? '',
      data: notification.data ?? {},
      createdAt: notification.createdAt ?? new Date(),
    };
    try {
      if (notification.userId) rooms.emitToRoom(Rooms.entity('user', String(notification.userId)), 'notification:new', payload);
      if (notification.sessionId) rooms.emitToRoom(Rooms.entity('session', String(notification.sessionId)), 'notification:new', payload);
    } catch {
      /* best-effort */
    }
  }

  emitRead(notification) {
    const rooms = this.#rooms();
    if (!rooms) return;
    const payload = { id: notification.id ?? String(notification._id) };
    try {
      if (notification.userId) rooms.emitToRoom(Rooms.entity('user', String(notification.userId)), 'notification:read', payload);
      if (notification.sessionId) rooms.emitToRoom(Rooms.entity('session', String(notification.sessionId)), 'notification:read', payload);
    } catch {
      /* best-effort */
    }
  }
}

export const notificationRealtimeService = new NotificationRealtimeService();
export default notificationRealtimeService;
