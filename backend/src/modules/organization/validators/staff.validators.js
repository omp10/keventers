import { z } from 'zod';

import { ORG_ROLES } from '../constants/organization.constants.js';

import { objectId } from './common.validators.js';

const assignableRoles = [
  ORG_ROLES.RESTAURANT_MANAGER,
  ORG_ROLES.BRANCH_MANAGER,
  ORG_ROLES.STAFF,
  'kitchen_manager',
  'cashier',
  'waiter',
];

export const inviteStaffSchema = z.object({
  email: z.string().email().toLowerCase(),
  firstName: z.string().trim().max(80).optional(),
  role: z.enum(assignableRoles),
  restaurantId: objectId.optional(),
  branchId: objectId.optional(),
});

export const listStaffQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().optional(),
});
