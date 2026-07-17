import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';

import { JourneyController } from '../controllers/journey.controller.js';
import { journeyIngestSchema } from '../validators/analytics.validators.js';

/**
 * @openapi
 * /api/v1/public/journey/events:
 *   post: { tags: [Analytics - Journey], summary: Ingest customer-journey events (batched, anonymous or guest-token bound), responses: { 202: { description: Accepted } } }
 */
const router = Router();
router.post('/events', validate({ body: journeyIngestSchema }), JourneyController.ingest);

export default router;
