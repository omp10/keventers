import { asyncHandler } from '#core/http/async-handler.js';
import { ForbiddenError } from '#core/errors/app-error.js';
import { ApiResponse } from '#core/http/api-response.js';

import { QR_ERRORS } from '../constants/qr.constants.js';
import { scanService } from '../services/scan.service.js';
import { sessionService } from '../services/session.service.js';

const deviceOf = (req) => ({
  deviceId: req.body?.device?.deviceId ?? null,
  userAgent: req.body?.device?.userAgent ?? req.headers['user-agent'] ?? '',
  ip: req.ip ?? '',
});

/** If a guest token is present it must match the session being acted on. */
function assertSessionOwnership(req, sessionId) {
  if (req.guest?.sessionId && req.guest.sessionId !== sessionId) {
    throw new ForbiddenError(QR_ERRORS.CROSS_TENANT);
  }
}

export const PublicSessionController = {
  /** GET /public/session/:sessionId */
  get: asyncHandler(async (req, res) => {
    assertSessionOwnership(req, req.params.sessionId);
    const data = await sessionService.getPublicSession(req.params.sessionId);
    ApiResponse.success(res, { data });
  }),

  /** POST /public/session/recover */
  recover: asyncHandler(async (req, res) => {
    const data = await scanService.recover({
      sessionId: req.body.sessionId,
      recoveryCode: req.body.recoveryCode,
      device: deviceOf(req),
    });
    ApiResponse.success(res, { data });
  }),

  /** POST /public/session/end */
  end: asyncHandler(async (req, res) => {
    assertSessionOwnership(req, req.body.sessionId);
    const data = await sessionService.endSession(req.body.sessionId);
    ApiResponse.success(res, { data });
  }),
};

export default PublicSessionController;
