import { container as sharedContainer } from '#core/di/container.js';
import { eventBus as sharedEventBus } from '#core/eventbus/index.js';
import { logger } from '#core/logging/logger.js';
import { permissionRegistry } from '#platform/auth/index.js';

import { PAYMENT_PERMISSIONS } from './constants/payment.constants.js';
import { PAYMENT_TOKENS } from './constants/payment.tokens.js';
import { registerPaymentEventHandlers } from './events/handlers.js';
import { providerFactory } from './providers/provider.factory.js';
import { configRepository } from './repositories/config.repository.js';
import { invoiceRepository } from './repositories/invoice.repository.js';
import { paymentIntentRepository } from './repositories/payment-intent.repository.js';
import { paymentRepository } from './repositories/payment.repository.js';
import { refundRepository } from './repositories/refund.repository.js';
import { settlementRepository } from './repositories/settlement.repository.js';
import { transactionRepository } from './repositories/transaction.repository.js';
import { webhookRepository } from './repositories/webhook.repository.js';
import paymentRouter from './routes/index.js';
import { invoiceService } from './services/invoice.service.js';
import { paymentConfigService } from './services/payment-config.service.js';
import { paymentIntentService } from './services/payment-intent.service.js';
import { paymentRealtimeService } from './services/payment-realtime.service.js';
import { paymentService } from './services/payment.service.js';
import { refundService } from './services/refund.service.js';
import { settlementService } from './services/settlement.service.js';
import { transactionService } from './services/transaction.service.js';
import { webhookService } from './services/webhook.service.js';

/**
 * Payment Engine composition — the single financial source of truth. Provider-
 * agnostic (adapters resolved per-restaurant via the ProviderFactory); it never
 * calculates prices (consumes the order's Pricing-Engine snapshot) and never
 * mutates orders (uses the sanctioned `recordPaymentStatus` seam + publishes
 * provider-independent events). Mounted at the API v1 root with specific
 * `/payments`, `/restaurant/*`, `/admin/*`, `/webhooks/*` paths; registered
 * BEFORE the organization module so those paths win.
 */
export const paymentModule = {
  name: 'payment',
  basePath: '/',
  router: paymentRouter,

  registerDependencies(container = sharedContainer) {
    container.register(PAYMENT_TOKENS.PaymentIntentRepository, paymentIntentRepository);
    container.register(PAYMENT_TOKENS.PaymentRepository, paymentRepository);
    container.register(PAYMENT_TOKENS.TransactionRepository, transactionRepository);
    container.register(PAYMENT_TOKENS.RefundRepository, refundRepository);
    container.register(PAYMENT_TOKENS.InvoiceRepository, invoiceRepository);
    container.register(PAYMENT_TOKENS.SettlementRepository, settlementRepository);
    container.register(PAYMENT_TOKENS.ConfigRepository, configRepository);
    container.register(PAYMENT_TOKENS.WebhookRepository, webhookRepository);

    container.register(PAYMENT_TOKENS.ProviderFactory, providerFactory);

    container.register(PAYMENT_TOKENS.PaymentService, paymentService);
    container.register(PAYMENT_TOKENS.PaymentIntentService, paymentIntentService);
    container.register(PAYMENT_TOKENS.TransactionService, transactionService);
    container.register(PAYMENT_TOKENS.RefundService, refundService);
    container.register(PAYMENT_TOKENS.InvoiceService, invoiceService);
    container.register(PAYMENT_TOKENS.SettlementService, settlementService);
    container.register(PAYMENT_TOKENS.WebhookService, webhookService);
    container.register(PAYMENT_TOKENS.PaymentConfigService, paymentConfigService);
    container.register(PAYMENT_TOKENS.PaymentRealtimeService, paymentRealtimeService);
  },

  bootstrapRbac() {
    permissionRegistry.registerMany(Object.values(PAYMENT_PERMISSIONS));
  },

  registerEventHandlers(eventBus = sharedEventBus) {
    registerPaymentEventHandlers(eventBus);
  },

  register({ container = sharedContainer, eventBus = sharedEventBus } = {}) {
    this.registerDependencies(container);
    this.bootstrapRbac();
    this.registerEventHandlers(eventBus);
    logger().info({ module: this.name }, 'Payment Engine module registered');
    return this;
  },
};

export default paymentModule;
