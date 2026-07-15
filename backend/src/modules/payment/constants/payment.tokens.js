/**
 * Module-local DI tokens for the Payment Engine. Future modules consume payment
 * EVENTS; internal composition + provider registry resolve through these.
 */
export const PAYMENT_TOKENS = Object.freeze({
  // Repositories
  PaymentIntentRepository: Symbol('payment.PaymentIntentRepository'),
  PaymentRepository: Symbol('payment.PaymentRepository'),
  TransactionRepository: Symbol('payment.TransactionRepository'),
  RefundRepository: Symbol('payment.RefundRepository'),
  InvoiceRepository: Symbol('payment.InvoiceRepository'),
  SettlementRepository: Symbol('payment.SettlementRepository'),
  ConfigRepository: Symbol('payment.ConfigRepository'),
  WebhookRepository: Symbol('payment.WebhookRepository'),

  // Provider abstraction
  ProviderFactory: Symbol('payment.ProviderFactory'),

  // Services
  PaymentService: Symbol('payment.PaymentService'),
  PaymentIntentService: Symbol('payment.PaymentIntentService'),
  TransactionService: Symbol('payment.TransactionService'),
  RefundService: Symbol('payment.RefundService'),
  InvoiceService: Symbol('payment.InvoiceService'),
  SettlementService: Symbol('payment.SettlementService'),
  WebhookService: Symbol('payment.WebhookService'),
  PaymentConfigService: Symbol('payment.PaymentConfigService'),
  PaymentRealtimeService: Symbol('payment.PaymentRealtimeService'),
});

export default PAYMENT_TOKENS;
