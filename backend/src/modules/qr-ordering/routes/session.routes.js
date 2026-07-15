import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { SessionController } from '../controllers/session.controller.js';
import { idParamSchema } from '../validators/common.validators.js';
import {
  listSessionsQuerySchema,
  releaseTableSchema,
} from '../validators/session.validators.js';

import { managementGuards } from './_guards.js';

const router = Router();

router.use(...managementGuards);

/**
 * @openapi
 * /api/v1/restaurant/sessions:
 *   get: { tags: [Sessions], security: [{ bearerAuth: [] }], summary: List guest sessions (?restaurantId=&branchId=&status=&tableId=), responses: { 200: { description: Paginated sessions } } }
 */
router.get('/', validate({ query: listSessionsQuerySchema }), SessionController.list);

/**
 * @openapi
 * /api/v1/restaurant/sessions/release-table:
 *   post: { tags: [Sessions], security: [{ bearerAuth: [] }], summary: Force-release a table (terminate its live sessions), responses: { 200: { description: Released } } }
 */
router.post('/release-table', validate({ body: releaseTableSchema }), SessionController.releaseTable);

/**
 * @openapi
 * /api/v1/restaurant/sessions/{id}:
 *   get: { tags: [Sessions], security: [{ bearerAuth: [] }], summary: Get a guest session, responses: { 200: { description: Session } } }
 * /api/v1/restaurant/sessions/{id}/terminate:
 *   post: { tags: [Sessions], security: [{ bearerAuth: [] }], summary: Terminate a live session, responses: { 200: { description: Terminated } } }
 */
router.get('/:id', validate({ params: idParamSchema }), SessionController.getById);
router.post('/:id/terminate', validate({ params: idParamSchema }), SessionController.terminate);

export default router;
