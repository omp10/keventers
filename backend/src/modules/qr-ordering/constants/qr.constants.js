/**
 * QR Ordering Gateway constants. This module owns these. It is the entry point
 * for every customer who scans a QR code; its responsibility ends after a valid
 * guest ordering session is created (NO cart / order logic here).
 */

/** Physical table operational status. */
export const TABLE_STATUS = Object.freeze({
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  OUT_OF_SERVICE: 'out_of_service',
  CLEANING: 'cleaning',
});

/** Table group kind (a floor, a named zone, an outdoor area, …). */
export const TABLE_GROUP_TYPE = Object.freeze({
  FLOOR: 'floor',
  ZONE: 'zone',
  SECTION: 'section',
  OUTDOOR: 'outdoor',
  ROOM: 'room',
});

export const TABLE_SHAPE = Object.freeze({
  SQUARE: 'square',
  ROUND: 'round',
  RECTANGLE: 'rectangle',
  CUSTOM: 'custom',
});

/** QR code lifecycle status. */
export const QR_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
});

/** Permanent QR (printed sticker) vs temporary QR (event/pop-up, expires). */
export const QR_TYPE = Object.freeze({
  PERMANENT: 'permanent',
  TEMPORARY: 'temporary',
});

/**
 * Guest ordering-session state machine. The Cart, Order, Kitchen and Payment
 * modules key their work off the SESSION id and observe this lifecycle later —
 * so a customer can stay anonymous, log in mid-journey, recover after a refresh,
 * or share a table without any of those modules being redesigned.
 *
 *   CREATED → ACTIVE → IDLE → CHECKOUT_PENDING → COMPLETED
 *                                     ↘ EXPIRED
 *                                     ↘ TERMINATED
 */
export const SESSION_STATUS = Object.freeze({
  CREATED: 'created',
  ACTIVE: 'active',
  IDLE: 'idle',
  CHECKOUT_PENDING: 'checkout_pending',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  TERMINATED: 'terminated',
});

/** Allowed session state transitions (guarded by the session service). */
export const SESSION_TRANSITIONS = Object.freeze({
  [SESSION_STATUS.CREATED]: [SESSION_STATUS.ACTIVE, SESSION_STATUS.TERMINATED, SESSION_STATUS.EXPIRED],
  [SESSION_STATUS.ACTIVE]: [
    SESSION_STATUS.IDLE,
    SESSION_STATUS.CHECKOUT_PENDING,
    SESSION_STATUS.COMPLETED,
    SESSION_STATUS.EXPIRED,
    SESSION_STATUS.TERMINATED,
  ],
  [SESSION_STATUS.IDLE]: [
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.CHECKOUT_PENDING,
    SESSION_STATUS.EXPIRED,
    SESSION_STATUS.TERMINATED,
  ],
  [SESSION_STATUS.CHECKOUT_PENDING]: [
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.COMPLETED,
    SESSION_STATUS.EXPIRED,
    SESSION_STATUS.TERMINATED,
  ],
  // Terminal states.
  [SESSION_STATUS.COMPLETED]: [],
  [SESSION_STATUS.EXPIRED]: [],
  [SESSION_STATUS.TERMINATED]: [],
});

/** States in which a session is considered "live" (holds table occupancy). */
export const LIVE_SESSION_STATUSES = Object.freeze([
  SESSION_STATUS.CREATED,
  SESSION_STATUS.ACTIVE,
  SESSION_STATUS.IDLE,
  SESSION_STATUS.CHECKOUT_PENDING,
]);

/** How a session ended (audit + analytics). */
export const SESSION_END_REASON = Object.freeze({
  GUEST_ENDED: 'guest_ended',
  ORDER_COMPLETED: 'order_completed',
  IDLE_TIMEOUT: 'idle_timeout',
  EXPIRED: 'expired',
  ADMIN_TERMINATED: 'admin_terminated',
  TABLE_RELEASED: 'table_released',
});

/** How a customer is identified on a session. */
export const GUEST_IDENTITY = Object.freeze({
  ANONYMOUS: 'anonymous',
  REGISTERED: 'registered',
});

/** Table auto-release triggers (documented occupancy release causes). */
export const RELEASE_TRIGGER = Object.freeze({
  ORDER_COMPLETION: 'order_completion',
  SESSION_TIMEOUT: 'session_timeout',
  MANUAL_ADMIN: 'manual_admin',
  SESSION_ENDED: 'session_ended',
  FORCE: 'force',
});

/** Guest JWT token type (distinct from platform access/refresh tokens). */
export const GUEST_TOKEN_TYPE = 'guest';

/** Redis key namespaces (all under the platform key prefix). */
export const REDIS_KEYS = Object.freeze({
  SESSION: 'qr:session', // qr:session:<sessionId> → active session snapshot
  TABLE_SESSIONS: 'qr:table-sessions', // qr:table-sessions:<tableId> → set of live sessionIds
  TABLE_OCCUPANCY: 'qr:table-occupancy', // qr:table-occupancy:<tableId> → status snapshot
  QR_VALIDATION: 'qr:qr-validation', // qr:qr-validation:<token> → cached QR validation record
  SCAN_RATELIMIT: 'qr-scan', // ratelimit identifier suffix
});

/** Cache TTLs (seconds) for non-sensitive lookups. */
export const CACHE_TTL = Object.freeze({
  QR_VALIDATION_SECONDS: 300,
  OCCUPANCY_SECONDS: 3600,
});

/** Storage folder for generated QR images (via the Storage Platform). */
export const STORAGE_FOLDERS = Object.freeze({
  QR_IMAGES: 'qr-codes',
});

/** Permissions specific to this module (registered with the RBAC platform).
 * `table:*` and `qr:*` CRUD already exist in the identity core catalog; the
 * net-new grants (session, granular qr/table ops) are seeded here. */
export const QR_PERMISSIONS = Object.freeze({
  TABLE_READ: 'table:read',
  TABLE_CREATE: 'table:create',
  TABLE_UPDATE: 'table:update',
  TABLE_DELETE: 'table:delete',
  TABLE_MANAGE: 'table:manage',
  QR_READ: 'qr:read',
  QR_CREATE: 'qr:create',
  QR_UPDATE: 'qr:update',
  QR_DELETE: 'qr:delete',
  QR_REGENERATE: 'qr:regenerate',
  SESSION_READ: 'session:read',
  SESSION_MANAGE: 'session:manage',
});

/** Net-new permission catalog rows this module seeds (CRUD already-existing
 * resources are omitted; the identity core seeder created table/qr CRUD). */
export const QR_NEW_PERMISSIONS = Object.freeze([
  { resource: 'table', action: 'manage', description: 'Manage table occupancy/status' },
  { resource: 'qr', action: 'regenerate', description: 'Regenerate / rotate QR codes' },
  { resource: 'session', action: 'read', description: 'View guest ordering sessions' },
  { resource: 'session', action: 'manage', description: 'Terminate / manage guest sessions' },
]);

export const QR_ERRORS = Object.freeze({
  TABLE_NOT_FOUND: 'Table not found',
  TABLE_GROUP_NOT_FOUND: 'Table group not found',
  QR_NOT_FOUND: 'QR code not found',
  SESSION_NOT_FOUND: 'Session not found',
  DUPLICATE_TABLE_NUMBER: 'A table with this number already exists in this branch',
  DUPLICATE_GROUP: 'A table group with this name already exists in this branch',
  INVALID_QR: 'Invalid or unrecognized QR code',
  QR_TAMPERED: 'QR code signature verification failed',
  QR_INACTIVE: 'This QR code is not active',
  QR_EXPIRED: 'This QR code has expired',
  RESTAURANT_UNAVAILABLE: 'Restaurant is not currently accepting orders',
  BRANCH_UNAVAILABLE: 'This branch is not currently accepting orders',
  BRANCH_CLOSED: 'This branch is closed right now',
  TABLE_UNAVAILABLE: 'This table is not available for ordering',
  NO_TABLES_CONFIGURED: "This outlet hasn't set up any tables yet, so table ordering isn't available here",
  INVALID_SESSION_TOKEN: 'Invalid or expired guest session token',
  SESSION_NOT_LIVE: 'This session is no longer active',
  INVALID_TRANSITION: 'Invalid session state transition',
  CROSS_TENANT: 'Access to this resource is not allowed',
  QR_TABLE_MISMATCH: 'QR code does not match the requested table',
});
