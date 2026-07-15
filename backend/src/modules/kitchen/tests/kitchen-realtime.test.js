import { describe, expect, it } from 'vitest';

import { KitchenRealtimeService } from '../services/kitchen-realtime.service.js';
import { SOCKET_EVENTS } from '../constants/kitchen.constants.js';

const entry = {
  id: 'e1',
  orderId: 'o1',
  orderNumber: 'KEV-DIN-1',
  status: 'ready',
  priority: 'normal',
  restaurantId: 'rest1',
  branchId: 'br1',
  stationIds: ['grill', 'beverage'],
};

function fakeSocket(calls) {
  return {
    io: {}, // "initialized"
    rooms() {
      return { emitToRoom: (room, event, payload) => calls.push({ room, event, payload }) };
    },
  };
}

describe('KitchenRealtimeService', () => {
  it('no-ops when the socket server is not initialized', () => {
    const service = new KitchenRealtimeService({ socket: { io: null } });
    expect(() => service.emit(entry, SOCKET_EVENTS.ORDER_READY)).not.toThrow();
    expect(() => service.queueUpdated(entry)).not.toThrow();
  });

  it('broadcasts to restaurant, branch and every station room (never other tenants)', () => {
    const calls = [];
    const service = new KitchenRealtimeService({ socket: fakeSocket(calls) });
    service.emit(entry, SOCKET_EVENTS.ORDER_READY);
    const rooms = calls.map((c) => c.room);
    expect(rooms).toContain('restaurant:rest1');
    expect(rooms).toContain('branch:br1');
    expect(rooms).toContain('station:grill');
    expect(rooms).toContain('station:beverage');
    // Only this tenant's rooms are targeted.
    expect(rooms.every((r) => r.includes('rest1') || r.includes('br1') || r.includes('grill') || r.includes('beverage'))).toBe(true);
    expect(calls.every((c) => c.event === SOCKET_EVENTS.ORDER_READY)).toBe(true);
  });
});
