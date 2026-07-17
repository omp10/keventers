/**
 * Kitchen Display System (KDS) constants. The KDS is a real-time OPERATIONAL
 * system: it CONSUMES Order events (never writes to orders), maintains its own
 * queue/station/workflow state, and communicates outward only through events +
 * Socket.IO. It never duplicates Order logic.
 */

/** Kitchen queue-entry workflow status. */
export const KITCHEN_STATUS = Object.freeze({
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  RECALLED: 'recalled',
  REFIRED: 'refired',
  CANCELLED: 'cancelled',
});

/**
 * Legal preparation-workflow transitions. Illegal transitions throw.
 *
 *   PENDING → ASSIGNED → PREPARING → READY → SERVED
 *   PREPARING → RECALLED → PREPARING     (pulled back, re-prepared)
 *   READY → REFIRED → PREPARING          (needs redo)
 *   (any active) → CANCELLED             (from order cancellation)
 */
export const KITCHEN_TRANSITIONS = Object.freeze({
  [KITCHEN_STATUS.PENDING]: [KITCHEN_STATUS.ASSIGNED, KITCHEN_STATUS.PREPARING, KITCHEN_STATUS.CANCELLED],
  [KITCHEN_STATUS.ASSIGNED]: [KITCHEN_STATUS.PREPARING, KITCHEN_STATUS.PENDING, KITCHEN_STATUS.CANCELLED],
  [KITCHEN_STATUS.PREPARING]: [KITCHEN_STATUS.READY, KITCHEN_STATUS.RECALLED, KITCHEN_STATUS.CANCELLED],
  [KITCHEN_STATUS.READY]: [KITCHEN_STATUS.SERVED, KITCHEN_STATUS.REFIRED, KITCHEN_STATUS.CANCELLED],
  [KITCHEN_STATUS.RECALLED]: [KITCHEN_STATUS.PREPARING, KITCHEN_STATUS.CANCELLED],
  [KITCHEN_STATUS.REFIRED]: [KITCHEN_STATUS.PREPARING, KITCHEN_STATUS.CANCELLED],
  [KITCHEN_STATUS.SERVED]: [],
  [KITCHEN_STATUS.CANCELLED]: [],
});

/** Statuses in which an entry is still on the board (active). */
export const ACTIVE_KITCHEN_STATUSES = Object.freeze([
  KITCHEN_STATUS.PENDING,
  KITCHEN_STATUS.ASSIGNED,
  KITCHEN_STATUS.PREPARING,
  KITCHEN_STATUS.READY,
  KITCHEN_STATUS.RECALLED,
  KITCHEN_STATUS.REFIRED,
]);

export const TERMINAL_KITCHEN_STATUSES = Object.freeze([KITCHEN_STATUS.SERVED, KITCHEN_STATUS.CANCELLED]);

/** Station kinds (configurable; a product may route to one or more). */
export const STATION_TYPE = Object.freeze({
  GRILL: 'grill',
  FRYER: 'fryer',
  BEVERAGE: 'beverage',
  DESSERT: 'dessert',
  PACKAGING: 'packaging',
  GENERAL: 'general',
});

/** Queue priority (rush orders jump the board). */
export const PRIORITY = Object.freeze({
  NORMAL: 'normal',
  HIGH: 'high',
  RUSH: 'rush',
});

/** Priority → numeric weight used for queue ordering (higher first). */
export const PRIORITY_WEIGHT = Object.freeze({
  [PRIORITY.NORMAL]: 0,
  [PRIORITY.HIGH]: 100,
  [PRIORITY.RUSH]: 200,
});

/** Chef assignment mode. */
export const ASSIGNMENT_MODE = Object.freeze({
  AUTO: 'auto',
  MANUAL: 'manual',
});

/** Who performed a kitchen action (timeline + audit). */
export const ACTOR_TYPE = Object.freeze({
  CHEF: 'chef',
  STAFF: 'staff',
  SYSTEM: 'system',
});

/** SLA target scope (most specific wins: product → category → branch default). */
export const SLA_SCOPE = Object.freeze({
  PRODUCT: 'product',
  CATEGORY: 'category',
  DEFAULT: 'default',
});

/** Redis key namespaces (all under the platform key prefix). */
export const REDIS_KEYS = Object.freeze({
  BRANCH_QUEUE: 'kds:branch-queue', // kds:branch-queue:<branchId> → ZSET(entryId → score)
  STATION_QUEUE: 'kds:station-queue', // kds:station-queue:<stationId> → SET(entryId)
  PREP_TIMER: 'kds:prep-timer', // kds:prep-timer:<entryId> → { preparingAt, targetSeconds }
  ENTRY_LOCK: 'kds:entry-mutation', // per-entry transition lock
});

export const CACHE_TTL = Object.freeze({
  QUEUE_SECONDS: 43200, // 12h — a kitchen shift
  TIMER_SECONDS: 43200,
});

/** Socket.IO realtime event names. */
export const SOCKET_EVENTS = Object.freeze({
  QUEUE_UPDATED: 'kitchen:queue_updated',
  ORDER_QUEUED: 'kitchen:order_queued',
  ORDER_ASSIGNED: 'kitchen:order_assigned',
  ORDER_PREPARING: 'kitchen:order_preparing',
  ORDER_READY: 'kitchen:order_ready',
  ORDER_SERVED: 'kitchen:order_served',
  ORDER_RECALLED: 'kitchen:order_recalled',
});

/** Map a status to its realtime socket event (when one exists). */
export const STATUS_SOCKET_EVENT = Object.freeze({
  [KITCHEN_STATUS.ASSIGNED]: SOCKET_EVENTS.ORDER_ASSIGNED,
  [KITCHEN_STATUS.PREPARING]: SOCKET_EVENTS.ORDER_PREPARING,
  [KITCHEN_STATUS.READY]: SOCKET_EVENTS.ORDER_READY,
  [KITCHEN_STATUS.SERVED]: SOCKET_EVENTS.ORDER_SERVED,
  [KITCHEN_STATUS.RECALLED]: SOCKET_EVENTS.ORDER_RECALLED,
});

export const DEFAULT_SLA_SECONDS = 900; // 15 min fallback when nothing configured

/** Permissions (net-new — `kitchen`/`station` are not in the identity catalog). */
export const KITCHEN_PERMISSIONS = Object.freeze({
  KITCHEN_READ: 'kitchen:read',
  KITCHEN_MANAGE: 'kitchen:manage',
  STATION_READ: 'station:read',
  STATION_CREATE: 'station:create',
  STATION_UPDATE: 'station:update',
  STATION_DELETE: 'station:delete',
});

export const KITCHEN_NEW_PERMISSIONS = Object.freeze([
  { resource: 'kitchen', action: 'read', description: 'View the kitchen queue' },
  { resource: 'kitchen', action: 'manage', description: 'Assign chefs and drive kitchen workflow' },
  { resource: 'station', action: 'read', description: 'View kitchen stations' },
  { resource: 'station', action: 'create', description: 'Create kitchen stations' },
  { resource: 'station', action: 'update', description: 'Update kitchen stations' },
  { resource: 'station', action: 'delete', description: 'Delete kitchen stations' },
]);

export const KITCHEN_ERRORS = Object.freeze({
  ENTRY_NOT_FOUND: 'Kitchen order not found',
  STATION_NOT_FOUND: 'Kitchen station not found',
  DUPLICATE_STATION: 'A station with this name already exists in this branch',
  INVALID_TRANSITION: 'Illegal kitchen workflow transition',
  ALREADY_QUEUED: 'This order is already in the kitchen queue',
  CHEF_REQUIRED: 'A chef must be assigned',
  NOT_ASSIGNED_TO_YOU: 'This order is not assigned to you',
  CROSS_TENANT: 'Access to this kitchen resource is not allowed',
  VERSION_CONFLICT: 'The kitchen order was modified concurrently — reload and retry',
  STATION_HAS_ENTRIES: 'Cannot delete a station with active kitchen orders',
});
