import { z } from 'zod';

import {
  ENVIRONMENT,
  PAYMENT_METHOD,
  PROVIDER,
} from '../constants/payment.constants.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id format');
export const idParamSchema = z.object({ id: objectId });

/** Create a payment intent. Amount (minor units) is OPTIONAL — omit for the full
 * remaining balance; provide for multi-payment/partial. Clients never set the
 * price; it is validated against the order's snapshot server-side. */
export const createIntentSchema = z
  .object({
    // Exactly one payable: an order, or a subscription bought on the spot.
    orderId: objectId.optional(),
    subscriptionId: objectId.optional(),
    provider: z.nativeEnum(PROVIDER).optional(),
    method: z.nativeEnum(PAYMENT_METHOD).optional(),
    amount: z.number().int().positive().optional(),
  })
  .refine((v) => Boolean(v.orderId) !== Boolean(v.subscriptionId), {
    message: 'Provide exactly one of orderId or subscriptionId',
  });

/** Confirm — the gateway handshake result is passed through opaquely to the
 * provider adapter for signature verification. */
export const confirmSchema = z.object({
  intentId: objectId,
  providerPayload: z.record(z.any()).default({}),
});

export const refundRequestSchema = z.object({
  paymentId: objectId,
  amount: z.number().int().positive().optional(),
  reason: z.string().trim().max(400).optional(),
});

export const manualPaymentSchema = z.object({
  orderId: objectId,
  amount: z.number().int().positive(),
  method: z.nativeEnum(PAYMENT_METHOD).optional(),
});

export const createSettlementSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  provider: z.nativeEnum(PROVIDER).optional(),
  commissionBps: z.number().int().min(0).max(10000).optional(),
  taxBps: z.number().int().min(0).max(10000).optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(120).optional(),
  search: z.string().trim().max(200).optional(),
  status: z.string().max(40).optional(),
  provider: z.nativeEnum(PROVIDER).optional(),
  method: z.nativeEnum(PAYMENT_METHOD).optional(),
  type: z.string().max(40).optional(),
  orderId: objectId.optional(),
  paymentId: objectId.optional(),
  restaurantId: objectId.optional(),
  branchId: objectId.optional(),
});

// --- provider config (credentials are write-only; never returned) ---
export const createConfigSchema = z.object({
  provider: z.nativeEnum(PROVIDER),
  environment: z.nativeEnum(ENVIRONMENT).optional(),
  merchantId: z.string().min(1).max(200),
  apiKey: z.string().min(1).max(400).optional(),
  secretKey: z.string().min(1).max(400),
  webhookSecret: z.string().min(1).max(400).optional(),
  extra: z.record(z.any()).optional(),
  enabledMethods: z.array(z.nativeEnum(PAYMENT_METHOD)).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export const updateConfigSchema = z
  .object({
    environment: z.nativeEnum(ENVIRONMENT).optional(),
    merchantId: z.string().min(1).max(200).optional(),
    apiKey: z.string().min(1).max(400).optional(),
    secretKey: z.string().min(1).max(400).optional(),
    webhookSecret: z.string().min(1).max(400).optional(),
    extra: z.record(z.any()).optional(),
    enabledMethods: z.array(z.nativeEnum(PAYMENT_METHOD)).optional(),
    isActive: z.boolean().optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });
