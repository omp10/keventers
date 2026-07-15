/**
 * Payment Engine — PUBLIC BARREL. Future modules (Customer, Loyalty,
 * Notifications, Analytics) CONSUME payment EVENTS from here rather than calling
 * the services. The provider interface + factory are exported so new gateways
 * can be registered without touching the payment services.
 */
export { paymentModule } from './payment.module.js';

// Service singletons.
export { paymentService } from './services/payment.service.js';
export { paymentIntentService } from './services/payment-intent.service.js';
export { refundService } from './services/refund.service.js';
export { invoiceService } from './services/invoice.service.js';
export { settlementService } from './services/settlement.service.js';
export { transactionService } from './services/transaction.service.js';
export { paymentConfigService } from './services/payment-config.service.js';
export { webhookService } from './services/webhook.service.js';

// Provider abstraction (register future gateways here — no service change).
export { PaymentProvider } from './providers/payment-provider.interface.js';
export { providerFactory, ProviderFactory } from './providers/provider.factory.js';

// Extension-point contracts.
export { PdfGenerator, SettlementProvider } from './interfaces/extension-points.interface.js';

// DI tokens + events + constants.
export { PAYMENT_TOKENS } from './constants/payment.tokens.js';
export * from './events/payment.events.js';
export {
  PROVIDER,
  ENVIRONMENT,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  INTENT_STATUS,
  REFUND_STATUS,
  TRANSACTION_TYPE,
  PAYMENT_PERMISSIONS,
} from './constants/payment.constants.js';

// Seeder.
export { paymentSeeder, PaymentSeeder } from './seeds/payment.seeder.js';
