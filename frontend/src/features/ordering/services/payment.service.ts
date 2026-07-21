import { api } from '@/platform/api';
import type { PaymentIntent, PaymentMethod, PaymentProvider, PaymentStatus } from '../types';

/**
 * The raw intent DTO the backend returns. It does NOT match the client's
 * PaymentIntent: amount is an integer (minor units), the provider handshake is
 * `checkoutPayload`, and there is no separate redirectUrl field. This drift is
 * why the Razorpay widget never received its options before — providerPayload
 * was simply undefined. We map it here, once, at the edge.
 */
type IntentDTO = {
  id: string;
  orderId: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutPayload?: (Record<string, unknown> & { redirectUrl?: string }) | null;
};

function toIntent(dto: IntentDTO): PaymentIntent {
  const payload = dto.checkoutPayload ?? undefined;
  return {
    id: dto.id,
    orderId: dto.orderId,
    provider: dto.provider,
    status: dto.status,
    amount: { amount: dto.amount, currency: dto.currency, major: dto.amount / 100 },
    redirectUrl: payload?.redirectUrl as string | undefined,
    providerPayload: payload,
  };
}

/**
 * PAYMENT SERVICE — provider-agnostic. The frontend asks the backend Payment
 * Engine to create an intent, then hands the returned handshake to the provider
 * widget (Razorpay) or redirect (PhonePe). Verification + capture happen on the
 * backend; the frontend only reflects status. No provider SDK secrets, no amount
 * math on the client.
 */
// Payment endpoints are session-scoped: the backend guards them with
// `requireGuest`, so they must ride the GUEST table-session token, NOT the
// account access token. Without `auth: 'guest'` the client defaults to the
// account token and every call 401s with "Invalid or expired guest session
// token" — even though the very same session just placed the order. This is
// exactly what cart/order do; payment simply forgot it.
const GUEST = { auth: 'guest' } as const;

class PaymentService {
  async createIntent(orderId: string, provider: PaymentProvider, method?: PaymentMethod) {
    const dto = await api.post<IntentDTO>('/payments/create-intent', { orderId, provider, method }, GUEST);
    return toIntent(dto);
  }

  /** Confirm after the provider handshake (Razorpay success payload / return). */
  confirm(intentId: string, providerPayload: Record<string, unknown>) {
    return api.post<{ status: PaymentStatus }>('/payments/confirm', { intentId, providerPayload }, GUEST);
  }
}

export const paymentService = new PaymentService();
