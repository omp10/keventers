import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { scanService } from '../services/scan.service.js';

/** Device fingerprint assembled from the request (never trusted for identity). */
const deviceOf = (req) => ({
  deviceId: req.body?.device?.deviceId ?? null,
  userAgent: req.body?.device?.userAgent ?? req.headers['user-agent'] ?? '',
  ip: req.ip ?? '',
});

export const PublicScanController = {
  /** POST /public/qr/scan — the customer entry point. */
  scan: asyncHandler(async (req, res) => {
    const data = await scanService.scan(req.body.code, {
      device: deviceOf(req),
      guestName: req.body.guestName,
      guestCount: req.body.guestCount,
      // A logged-in customer scanning carries their account through the session.
      customerUserId: req.principal?.authenticated ? req.principal.id : null,
    });
    ApiResponse.success(res, { data, statusCode: 201 });
  }),
};

export default PublicScanController;
