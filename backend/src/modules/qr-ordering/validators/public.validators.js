import { z } from 'zod';

import { deviceSchema } from './common.validators.js';

/** POST /public/qr/scan — the scanned code plus optional guest hints. */
export const scanSchema = z.object({
  code: z.string().min(8).max(400),
  device: deviceSchema.optional(),
  guestName: z.string().trim().max(80).optional(),
  guestCount: z.coerce.number().int().min(1).max(50).optional(),
});

/**
 * POST /public/session/open — start ordering by typing a table number instead
 * of scanning. The table is required: guest sessions are table-scoped, which is
 * what lets the kitchen and staff route the order back to a place.
 */
export const openSessionSchema = z.object({
  branchSlug: z.string().trim().min(1).max(120),
  tableNumber: z.string().trim().min(1).max(20),
  device: deviceSchema.optional(),
  guestName: z.string().trim().max(80).optional(),
  guestCount: z.coerce.number().int().min(1).max(50).optional(),
});

/** POST /public/session/recover — recover by sessionId or recoveryCode. */
export const recoverSchema = z
  .object({
    sessionId: z.string().min(8).max(80).optional(),
    recoveryCode: z.string().min(8).max(120).optional(),
    device: deviceSchema.optional(),
  })
  .refine((v) => v.sessionId || v.recoveryCode, {
    message: 'sessionId or recoveryCode is required',
  });

/** POST /public/session/end. */
export const endSessionSchema = z.object({
  sessionId: z.string().min(8).max(80),
});
