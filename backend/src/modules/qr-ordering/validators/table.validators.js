import { z } from 'zod';

import {
  TABLE_GROUP_TYPE,
  TABLE_SHAPE,
  TABLE_STATUS,
} from '../constants/qr.constants.js';

import { objectId } from './common.validators.js';

export const createTableSchema = z.object({
  number: z.string().trim().min(1).max(40),
  name: z.string().trim().max(80).optional(),
  groupId: objectId.nullable().optional(),
  floor: z.string().trim().max(40).optional(),
  zone: z.string().trim().max(80).optional(),
  seatingCapacity: z.number().int().min(1).max(100).optional(),
  shape: z.nativeEnum(TABLE_SHAPE).optional(),
  status: z.nativeEnum(TABLE_STATUS).optional(),
  isReserved: z.boolean().optional(),
  isOrderingEnabled: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateTableSchema = createTableSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });

export const setTableStatusSchema = z.object({
  status: z.nativeEnum(TABLE_STATUS),
});

export const createTableGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.nativeEnum(TABLE_GROUP_TYPE).optional(),
  floor: z.string().trim().max(40).optional(),
  description: z.string().trim().max(400).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateTableGroupSchema = createTableGroupSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'No updatable fields provided' });
