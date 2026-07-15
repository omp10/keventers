import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]+$/, 'Role name may contain lowercase letters, digits and underscores'),
  displayName: z.string().trim().max(120).optional(),
  description: z.string().trim().max(500).optional(),
  permissions: z.array(z.string().trim()).optional(),
  priority: z.number().int().optional(),
});

export const updateRoleSchema = z
  .object({
    displayName: z.string().trim().max(120).optional(),
    description: z.string().trim().max(500).optional(),
    priority: z.number().int().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const rolePermissionsSchema = z.object({
  permissions: z.array(z.string().trim().min(1)).min(1),
});
