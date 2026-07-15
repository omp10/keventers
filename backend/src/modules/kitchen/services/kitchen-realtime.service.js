import { BaseService } from '#core/service/base.service.js';
import { Rooms, socketServer } from '#platform/socket/index.js';

import { SOCKET_EVENTS } from '../constants/kitchen.constants.js';

/**
 * Realtime kitchen propagation over Socket.IO. Broadcasts board + status events
 * to the RESTAURANT, BRANCH and STATION rooms — never to unrelated tenants (the
 * room ids are the tenant/station ids). BEST-EFFORT: if the socket server isn't
 * initialized (tests / sockets disabled) it silently no-ops and never blocks a
 * kitchen transition.
 */
export class KitchenRealtimeService extends BaseService {
  constructor({ socket = socketServer, eventBus } = {}) {
    super({ name: 'kitchen.realtime', eventBus });
    this.socket = socket;
  }

  #rooms() {
    return this.socket.rooms('/');
  }

  /** Emit a status event to the order's restaurant, branch and station rooms. */
  emit(entry, eventName, extra = {}) {
    if (!eventName || !this.socket?.io) return;
    try {
      const rooms = this.#rooms();
      const payload = {
        entryId: entry.id ?? String(entry._id),
        orderId: String(entry.orderId),
        orderNumber: entry.orderNumber,
        status: entry.status,
        priority: entry.priority,
        restaurantId: String(entry.restaurantId),
        branchId: String(entry.branchId),
        ...extra,
      };
      rooms.emitToRoom(Rooms.entity('restaurant', payload.restaurantId), eventName, payload);
      rooms.emitToRoom(Rooms.entity('branch', payload.branchId), eventName, payload);
      for (const s of entry.stationIds ?? []) {
        rooms.emitToRoom(Rooms.entity('station', String(s)), eventName, payload);
      }
    } catch (err) {
      this.logger.warn({ err }, 'Kitchen realtime emit failed (continuing)');
    }
  }

  /** Notify a branch board that its queue changed (counts/ordering). */
  queueUpdated(entry, extra = {}) {
    if (!this.socket?.io) return;
    try {
      const rooms = this.#rooms();
      const payload = { branchId: String(entry.branchId), restaurantId: String(entry.restaurantId), ...extra };
      rooms.emitToRoom(Rooms.entity('branch', payload.branchId), SOCKET_EVENTS.QUEUE_UPDATED, payload);
      rooms.emitToRoom(Rooms.entity('restaurant', payload.restaurantId), SOCKET_EVENTS.QUEUE_UPDATED, payload);
    } catch (err) {
      this.logger.warn({ err }, 'Kitchen queue-updated emit failed (continuing)');
    }
  }
}

export const kitchenRealtimeService = new KitchenRealtimeService();
export default kitchenRealtimeService;
