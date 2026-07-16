import { api } from '@/platform/api';
import type { PaymentIntent, PaymentMethod, PaymentProvider, PaymentStatus } from '../types';

/**
 * PAYMENT SERVICE — provider-agnostic. The frontend asks the backend Payment
 * Engine to create an intent, then hands the returned handshake to the provider
 * widget (Razorpay) or redirect (PhonePe). Verification + capture happen on the
 * backend (webhook reconciliation); the frontend only reflects status. No provider
 * SDK secrets, no amount math on the client.
 */
class PaymentService {
  createIntent(orderId: string, provider: PaymentProvider, method?: PaymentMethod) {
    return api.post<PaymentIntent>('/payments/create-intent', { orderId, provider, method });
  }

  /** Confirm after the provider handshake (Razorpay success payload / return). */
  confirm(intentId: string, providerPayload: Record<string, unknown>) {
    return api.post<{ status: PaymentStatus }>('/payments/confirm', { intentId, providerPayload });
  }

}

export const paymentService = new PaymentService();
