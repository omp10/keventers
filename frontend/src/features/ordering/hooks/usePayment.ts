import { useMutationResource } from '@/platform/query';
import { paymentService } from '../services';
import type { PaymentIntent, PaymentMethod, PaymentProvider, PaymentStatus } from '../types';

/**
 * usePayment — thin wrapper over the Payment Platform. Creates an intent and
 * confirms after the provider handshake. Capture/verification are backend + webhook
 * concerns; the frontend only orchestrates the handshake and reflects status.
 */
export function usePayment() {
  const create = useMutationResource<PaymentIntent, { orderId: string; provider: PaymentProvider; method?: PaymentMethod }>(
    ({ orderId, provider, method }) => paymentService.createIntent(orderId, provider, method),
  );
  const confirm = useMutationResource<{ status: PaymentStatus }, { intentId: string; payload: Record<string, unknown> }>(
    ({ intentId, payload }) => paymentService.confirm(intentId, payload),
  );
  return {
    createIntent: (orderId: string, provider: PaymentProvider, method?: PaymentMethod) => create.mutateAsync({ orderId, provider, method }),
    confirm: (intentId: string, payload: Record<string, unknown>) => confirm.mutateAsync({ intentId, payload }),
    creating: create.isPending,
    confirming: confirm.isPending,
    error: create.error ?? confirm.error,
  };
}
