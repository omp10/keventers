import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { journeyService } from '../services/journey.service.js';

/** The management guards scope callers to one restaurant; default to it. */
const scopeOf = (req) => req.query?.restaurantId ?? req.tenant?.primaryRestaurantId;

/** Public sink (customer app) + restaurant reads (dashboard journeys page). */
export const JourneyController = {
  /** POST /public/journey/events — batched ingest; anonymous or guest-token bound. */
  ingest: asyncHandler(async (req, res) => {
    const data = await journeyService.ingest(req.body.events, {
      authorization: req.headers.authorization,
    });
    ApiResponse.success(res, { data, statusCode: 202 });
  }),

  /** GET /restaurant/analytics/journeys — recent journeys, newest first. */
  list: asyncHandler(async (req, res) => {
    const { branchId, page, limit } = req.validatedQuery ?? {};
    const data = await journeyService.listJourneys(scopeOf(req), { branchId, page, limit });
    ApiResponse.success(res, { data });
  }),

  /** GET /restaurant/analytics/journeys/:journeyId — one journey's timeline. */
  get: asyncHandler(async (req, res) => {
    const data = await journeyService.getJourney(scopeOf(req), req.params.journeyId);
    ApiResponse.success(res, { data });
  }),
};

export default JourneyController;
