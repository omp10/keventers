import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';

import { QR_PERMISSIONS } from './constants/qr.constants.js';
import { QR_TOKENS } from './constants/qr.tokens.js';
import { registerQrEventHandlers } from './events/handlers.js';
import { guestSessionRepository } from './repositories/guest-session.repository.js';
import { qrCodeRepository } from './repositories/qr-code.repository.js';
import { tableGroupRepository } from './repositories/table-group.repository.js';
import { tableRepository } from './repositories/table.repository.js';
import qrRouter from './routes/index.js';
import { guestTokenService } from './services/guest-token.service.js';
import { occupancyService } from './services/occupancy.service.js';
import { qrImageService } from './services/qr-image.service.js';
import { qrService } from './services/qr.service.js';
import { scanService } from './services/scan.service.js';
import { sessionService } from './services/session.service.js';
import { tableGroupService } from './services/table-group.service.js';
import { tableService } from './services/table.service.js';
import { guestSessionStore } from './stores/session.store.js';
import { occupancyStore } from './stores/occupancy.store.js';
import { qrValidationCache } from './stores/qr-validation.cache.js';

/**
 * QR Ordering Gateway module composition. Mounted at the API v1 root (basePath
 * '/') with SPECIFIC sub-paths (see routes/index.js). Registered BEFORE the
 * organization module so its exact `/public/qr`, `/restaurant/tables`,
 * `/admin/tables`, … mounts win, while everything else falls through.
 *
 * INHERITS multi-tenancy from the organization module and composes the catalog
 * module (active menu in the scan context). The guest SESSION it creates is the
 * primary customer identity that Cart, Order, Kitchen and Payment reference.
 */
export const qrOrderingModule = {
  name: 'qr-ordering',
  basePath: '/',
  router: qrRouter,

  registerDependencies(container = sharedContainer) {
    // Repositories
    container.register(QR_TOKENS.TableRepository, tableRepository);
    container.register(QR_TOKENS.TableGroupRepository, tableGroupRepository);
    container.register(QR_TOKENS.QrCodeRepository, qrCodeRepository);
    container.register(QR_TOKENS.GuestSessionRepository, guestSessionRepository);

    // Redis stores
    container.register(QR_TOKENS.SessionStore, guestSessionStore);
    container.register(QR_TOKENS.OccupancyStore, occupancyStore);
    container.register(QR_TOKENS.QrValidationCache, qrValidationCache);

    // Services
    container.register(QR_TOKENS.TableService, tableService);
    container.register(QR_TOKENS.TableGroupService, tableGroupService);
    container.register(QR_TOKENS.QrService, qrService);
    container.register(QR_TOKENS.QrImageService, qrImageService);
    container.register(QR_TOKENS.SessionService, sessionService);
    container.register(QR_TOKENS.ScanService, scanService);
    container.register(QR_TOKENS.OccupancyService, occupancyService);
    container.register(QR_TOKENS.GuestTokenService, guestTokenService);
  },

  bootstrapRbac() {
    permissionRegistry.registerMany(Object.values(QR_PERMISSIONS));
  },

  registerEventHandlers(eventBus = sharedEventBus) {
    registerQrEventHandlers(eventBus);
  },

  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.bootstrapRbac();
    this.registerEventHandlers(eventBus);
    logger().info({ module: this.name }, 'QR Ordering module registered');
    return this;
  },
};

export default qrOrderingModule;
