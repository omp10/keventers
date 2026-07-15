import { z } from 'zod';

export const createPermissionSchema = z.object({
  resource: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Resource may contain lowercase letters, digits and hyphens'),
  action: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, 'Action may contain lowercase letters, digits and hyphens'),
  description: z.string().trim().max(500).optional(),
});

export const updatePermissionSchema = z
  .object({
    description: z.string().trim().max(500).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });
