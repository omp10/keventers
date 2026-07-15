import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';

import { ORDER_PERMISSIONS } from './constants/order.constants.js';
import { ORDER_TOKENS } from './constants/order.tokens.js';
import { registerOrderEventHandlers } from './events/handlers.js';
import { orderCounterRepository } from './repositories/order-counter.repository.js';
import { orderRepository } from './repositories/order.repository.js';
import orderRouter from './routes/index.js';
import { orderNumberService } from './services/order-number.service.js';
import { orderRealtimeService } from './services/order-realtime.service.js';
import { orderSnapshotService } from './services/order-snapshot.service.js';
import { orderService } from './services/order.service.js';
import { idempotencyStore } from './stores/idempotency.store.js';
import { orderCacheStore } from './stores/order-cache.store.js';

/**
 * Order Management Engine composition. Mounted at the API v1 root (basePath '/')
 * with specific sub-paths (`/orders`, `/restaurant/orders`, `/admin/orders`).
 * Registered BEFORE the organization module so the specific paths win. Composes
 * the Cart (checkout boundary), Pricing Engine (via the cart lock), Guest
 * Session, Organization, Socket, Notification and Event-Bus platforms. It NEVER
 * computes prices and NEVER lets a controller move status directly.
 */
export const orderModule = {
  name: 'order',
  basePath: '/',
  router: orderRouter,

  registerDependencies(container = sharedContainer) {
    container.register(ORDER_TOKENS.OrderRepository, orderRepository);
    container.register(ORDER_TOKENS.OrderCounterRepository, orderCounterRepository);
    container.register(ORDER_TOKENS.OrderCacheStore, orderCacheStore);
    container.register(ORDER_TOKENS.IdempotencyStore, idempotencyStore);
    container.register(ORDER_TOKENS.OrderService, orderService);
    container.register(ORDER_TOKENS.OrderNumberService, orderNumberService);
    container.register(ORDER_TOKENS.OrderSnapshotService, orderSnapshotService);
    container.register(ORDER_TOKENS.OrderRealtimeService, orderRealtimeService);
  },

  bootstrapRbac() {
    permissionRegistry.registerMany(Object.values(ORDER_PERMISSIONS));
  },

  registerEventHandlers(eventBus = sharedEventBus) {
    registerOrderEventHandlers(eventBus);
  },

  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.bootstrapRbac();
    this.registerEventHandlers(eventBus);
    logger().info({ module: this.name }, 'Order module registered');
    return this;
  },
};

export default orderModule;
