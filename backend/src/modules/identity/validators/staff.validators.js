import { z } from 'zod';

import { STAFF_STATUS } from '../constants/identity.constants.js';

import { objectId, passwordSchema } from './common.validators.js';

export const createStaffSchema = z.object({
  // User identity for the staff member.
  email: z.string().email().toLowerCase(),
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  roles: z.array(z.string()).optional(),
  // Staff attributes.
  employeeId: z.string().trim().min(1).max(40),
  designation: z.string().trim().max(120).optional(),
  department: z.string().trim().max(120).optional(),
  reportsTo: objectId.optional(),
  joinedAt: z.coerce.date().optional(),
});

export const updateStaffSchema = z
  .object({
    designation: z.string().trim().max(120).optional(),
    department: z.string().trim().max(120).optional(),
    reportsTo: objectId.optional(),
    status: z.nativeEnum(STAFF_STATUS).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });
