import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { authService } from '../services/auth.service.js';
import { userService } from '../services/user.service.js';

/** Derive lightweight request metadata for session context (no PII beyond IP/UA). */
const requestMeta = (req) => ({ ip: req.ip, userAgent: req.headers['user-agent'] });

export const AuthController = {
  register: asyncHandler(async (req, res) => {
    const data = await authService.register(req.body, requestMeta(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  login: asyncHandler(async (req, res) => {
    const data = await authService.login(req.body.email, req.body.password, requestMeta(req));
    ApiResponse.success(res, { data });
  }),

  refresh: asyncHandler(async (req, res) => {
    const data = await authService.refresh(req.body.refreshToken);
    ApiResponse.success(res, { data });
  }),

  logout: asyncHandler(async (req, res) => {
    const data = await authService.logout(req.principal.id, req.principal.sessionId);
    ApiResponse.success(res, { data });
  }),

  logoutAll: asyncHandler(async (req, res) => {
    const data = await authService.logoutAll(req.principal.id);
    ApiResponse.success(res, { data });
  }),

  me: asyncHandler(async (req, res) => {
    const data = await authService.me(req.principal.id);
    ApiResponse.success(res, { data });
  }),

  changePassword: asyncHandler(async (req, res) => {
    const data = await userService.changePassword(
      req.principal.id,
      req.body.currentPassword,
      req.body.newPassword,
    );
    ApiResponse.success(res, { data });
  }),

  requestPasswordReset: asyncHandler(async (req, res) => {
    const data = await userService.requestPasswordReset(req.body.email);
    ApiResponse.success(res, { data, statusCode: 202 });
  }),

  confirmPasswordReset: asyncHandler(async (req, res) => {
    const data = await userService.confirmPasswordReset(req.body.token, req.body.newPassword);
    ApiResponse.success(res, { data });
  }),
};

export default AuthController;
