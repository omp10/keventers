import { z } from 'zod';

import { USER_STATUS, USER_TYPE, GENDER } from '../constants/identity.constants.js';

import { objectId, passwordSchema } from './common.validators.js';

const phone = z.string().trim().min(7).max(20).optional();

export const createUserSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  phone,
  type: z.nativeEnum(USER_TYPE).optional(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80).optional(),
    lastName: z.string().trim().max(80).optional(),
    phone,
    email: z.string().email().toLowerCase().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const updateProfileSchema = z
  .object({
    avatarUrl: z.string().url().optional(),
    dateOfBirth: z.coerce.date().optional(),
    gender: z.nativeEnum(GENDER).optional(),
    bio: z.string().trim().max(500).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No profile fields provided' });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email().toLowerCase(),
});

export const confirmPasswordResetSchema = z.object({
  token: z.string().min(10),
  newPassword: passwordSchema,
});

export const assignRolesSchema = z.object({
  roles: z.array(z.string().trim().min(1)).min(1),
});

export const assignPermissionsSchema = z.object({
  permissions: z.array(z.string().trim().min(1)).min(1),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().optional(),
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(USER_STATUS).optional(),
  type: z.nativeEnum(USER_TYPE).optional(),
  role: z.string().optional(),
});

export const userIdParamSchema = z.object({ id: objectId });
