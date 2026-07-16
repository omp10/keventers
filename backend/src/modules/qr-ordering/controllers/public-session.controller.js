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

/**
 * Map the internal session + context onto the customer app's OrderingSession
 * contract (flat, slug-addressed, token included) — the client shouldn't have to
 * know the QR module's internal shape.
 */
const toOrderingSession = ({ session, guestToken, context }, { branchSlug, tableNumber }) => ({
  id: session.sessionId,
  branchSlug,
  branchName: context?.branch?.name ?? undefined,
  tableCode: tableNumber ?? undefined,
  channel: 'dine_in',
  token: guestToken,
  currency: context?.branch?.settings?.currency ?? context?.restaurant?.settings?.currency ?? 'INR',
});

export const PublicSessionController = {
  /**
   * POST /public/session/open — start ordering at a table without a QR scan.
   * Same validation as a scan (restaurant/branch active, open hours, table
   * orderable); the typed table number replaces the signed code.
   */
  open: asyncHandler(async (req, res) => {
    const { branchSlug, tableNumber } = req.body;
    const result = await scanService.openSession(
      { branchSlug, tableNumber },
      {
        device: deviceOf(req),
        guestName: req.body.guestName,
        guestCount: req.body.guestCount,
        customerUserId: req.principal?.authenticated ? req.principal.id : null,
      },
    );
    ApiResponse.success(res, {
      data: toOrderingSession(result, { branchSlug, tableNumber }),
      statusCode: 201,
    });
  }),

  /** GET /public/session/current — resume from the caller's guest token. */
  current: asyncHandler(async (req, res) => {
    if (!req.guest?.sessionId) throw new ForbiddenError(QR_ERRORS.INVALID_SESSION_TOKEN);
    const data = await sessionService.getPublicSession(req.guest.sessionId);
    ApiResponse.success(res, { data });
  }),

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
