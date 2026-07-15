import { BaseService } from '#core/service/base.service.js';
import { Rooms, socketServer } from '#platform/socket/index.js';

/**
 * Realtime order propagation via the Socket.IO platform. Emits status events to
 * the order room, the guest-session room and the branch room (for staff/KDS
 * consumers). BEST-EFFORT: if the socket server isn't initialized (e.g. tests,
 * or sockets disabled) it silently no-ops — realtime is never allowed to block
 * or fail an order transition.
 */
export class OrderRealtimeService extends BaseService {
  constructor({ socket = socketServer, eventBus } = {}) {
    super({ name: 'order.realtime', eventBus });
    this.socket = socket;
  }

  emit(order, eventName) {
    if (!eventName || !this.socket?.io) return;
    try {
      const rooms = this.socket.rooms('/');
      const payload = {
        orderId: order.id ?? String(order._id),
        orderNumber: order.orderNumber,
        status: order.status,
        branchId: String(order.branchId),
        sessionId: order.sessionId,
      };
      rooms.emitToRoom(Rooms.entity('order', payload.orderId), eventName, payload);
      rooms.emitToRoom(Rooms.entity('session', order.sessionId), eventName, payload);
      rooms.emitToRoom(Rooms.entity('branch', String(order.branchId)), eventName, payload);
    } catch (err) {
      this.logger.warn({ err }, 'Realtime order emit failed (continuing)');
    }
  }
}

export const orderRealtimeService = new OrderRealtimeService();
export default orderRealtimeService;
