/**
 * Module-local DI tokens for the QR Ordering Gateway. Registered by the
 * composition root; future modules (Cart, Order, Kitchen, Payment) resolve the
 * SessionService through these tokens so they reference the guest SESSION as the
 * primary ordering identity without coupling to internals.
 */
export const QR_TOKENS = Object.freeze({
  // Repositories
  TableRepository: Symbol('qr.TableRepository'),
  TableGroupRepository: Symbol('qr.TableGroupRepository'),
  QrCodeRepository: Symbol('qr.QrCodeRepository'),
  GuestSessionRepository: Symbol('qr.GuestSessionRepository'),

  // Redis stores
  SessionStore: Symbol('qr.SessionStore'),
  OccupancyStore: Symbol('qr.OccupancyStore'),
  QrValidationCache: Symbol('qr.QrValidationCache'),

  // Services
  TableService: Symbol('qr.TableService'),
  TableGroupService: Symbol('qr.TableGroupService'),
  QrService: Symbol('qr.QrService'),
  QrImageService: Symbol('qr.QrImageService'),
  SessionService: Symbol('qr.SessionService'),
  ScanService: Symbol('qr.ScanService'),
  OccupancyService: Symbol('qr.OccupancyService'),
  GuestTokenService: Symbol('qr.GuestTokenService'),
});

export default QR_TOKENS;
