/**
 * QR Ordering Gateway module — PUBLIC BARREL. Other modules (Cart, Order,
 * Kitchen, Payment, Customer, Analytics) import ONLY from here. Critically, the
 * guest SESSION is the primary ordering identity — downstream modules reference
 * `sessionId` and compose the SessionService (via its DI token) rather than
 * depending on a customer id.
 */
export { qrOrderingModule } from './qr-ordering.module.js';

// Service singletons.
export { scanService } from './services/scan.service.js';
export { sessionService } from './services/session.service.js';
export { tableService } from './services/table.service.js';
export { tableGroupService } from './services/table-group.service.js';
export { qrService } from './services/qr.service.js';
export { qrImageService } from './services/qr-image.service.js';
export { occupancyService } from './services/occupancy.service.js';
export { guestTokenService } from './services/guest-token.service.js';

// Guest-auth middleware (Cart/Order routes reuse these to authenticate guests).
export { resolveGuest, requireGuest } from './middleware/guest-auth.middleware.js';

// Business-hours evaluation (reused by Cart validation — do not duplicate).
export { isBranchOpen } from './utils/business-hours.util.js';

// DI tokens.
export { QR_TOKENS } from './constants/qr.tokens.js';

// Domain events + names other modules can subscribe to.
export * from './events/qr.events.js';

// QR renderer contract (extension point for a custom image backend).
export { QrRenderer } from './interfaces/qr-renderer.interface.js';

// Public constants (session lifecycle drives Cart/Order/Payment later).
export {
  SESSION_STATUS,
  SESSION_TRANSITIONS,
  LIVE_SESSION_STATUSES,
  SESSION_END_REASON,
  TABLE_STATUS,
  QR_STATUS,
  QR_TYPE,
  GUEST_IDENTITY,
  QR_PERMISSIONS,
} from './constants/qr.constants.js';

// Seeder.
export { qrSeeder, QrSeeder } from './seeds/qr.seeder.js';
