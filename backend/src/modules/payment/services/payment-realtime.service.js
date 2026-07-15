import { BaseService } from '#core/service/base.service.js';
import { Rooms, socketServer } from '#platform/socket/index.js';

/**
 * Realtime payment propagation over Socket.IO so restaurant dashboards update
 * live. Emits to the RESTAURANT and BRANCH rooms only (never other tenants).
 * BEST-EFFORT: no-ops if the socket server isn't initialized; never blocks a
 * financial operation. Payloads are non-secret.
 */
export class PaymentRealtimeService extends BaseService {
  constructor({ socket = socketServer, eventBus } = {}) {
    super({ name: 'payment.realtime', eventBus });
    this.socket = socket;
  }

  emit(entity, eventName, extra = {}) {
    if (!eventName || !this.socket?.io) return;
    try {
      const rooms = this.socket.rooms('/');
      const payload = {
        paymentId: entity.id ?? (entity._id ? String(entity._id) : null),
        orderId: entity.orderId ? String(entity.orderId) : null,
        status: entity.status,
        amount: entity.amount,
        currency: entity.currency,
        restaurantId: String(entity.restaurantId),
        branchId: entity.branchId ? String(entity.branchId) : null,
        ...extra,
      };
      rooms.emitToRoom(Rooms.entity('restaurant', payload.restaurantId), eventName, payload);
      if (payload.branchId) rooms.emitToRoom(Rooms.entity('branch', payload.branchId), eventName, payload);
    } catch (err) {
      this.logger.warn({ err }, 'Payment realtime emit failed (continuing)');
    }
  }
}

export const paymentRealtimeService = new PaymentRealtimeService();
export default paymentRealtimeService;
