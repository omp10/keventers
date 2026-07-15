import { z } from 'zod';

import { QR_TYPE } from '../constants/qr.constants.js';

import { objectId } from './common.validators.js';

/** POST /restaurant/qr — generate a QR for a table. */
export const generateQrSchema = z.object({
  tableId: objectId,
  type: z.nativeEnum(QR_TYPE).optional(),
  expiresAt: z.coerce.date().nullable().optional(),
});
