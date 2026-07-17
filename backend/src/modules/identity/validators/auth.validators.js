import { z } from 'zod';

import { passwordSchema } from './common.validators.js';

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

/** Phone is normalized to E.164 by the OTP service — accept what users type. */
const phoneSchema = z.string().trim().min(8).max(20);

export const otpRequestSchema = z.object({ phone: phoneSchema });

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
});

/** Self-service identity edit — name only; see `authService.updateMe`. */
export const updateMeSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().max(80).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});
