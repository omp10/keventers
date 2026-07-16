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
      // Each transition goes out twice: the SPECIFIC event (order:preparing …)
      // for consumers that switch on names, and the GENERIC
      // `order:status_changed` that trackers subscribe to once. Without the
      // generic one, the customer tracking page (which listens for
      // status_changed) would never hear anything — the two lists must overlap.
      for (const name of [eventName, 'order:status_changed']) {
        rooms.emitToRoom(Rooms.entity('order', payload.orderId), name, payload);
        rooms.emitToRoom(Rooms.entity('session', order.sessionId), name, payload);
        rooms.emitToRoom(Rooms.entity('branch', String(order.branchId)), name, payload);
      }
    } catch (err) {
      this.logger.warn({ err }, 'Realtime order emit failed (continuing)');
    }
  }
}

export const orderRealtimeService = new OrderRealtimeService();
export default orderRealtimeService;
