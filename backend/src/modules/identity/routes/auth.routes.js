import { Router } from 'express';

import { validate } from '#core/validation/validate.middleware.js';
import { requireAuth } from '#platform/auth/index.js';

import { AuthController } from '../controllers/auth.controller.js';
import { authRateLimit } from '../middleware/auth-rate-limit.middleware.js';
import {
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  registerSchema,
} from '../validators/auth.validators.js';
import {
  changePasswordSchema,
  confirmPasswordResetSchema,
  requestPasswordResetSchema,
} from '../validators/user.validators.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Identity/Auth
 *     description: Authentication, sessions and password management
 */

/**
 * @openapi
 * /api/v1/identity/auth/register:
 *   post:
 *     tags: [Identity/Auth]
 *     summary: Register a new customer account and start a session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *     responses:
 *       201: { description: Registered; returns user + tokens }
 *       409: { description: Email already registered }
 */
router.post('/register', authRateLimit('register'), validate({ body: registerSchema }), AuthController.register);

/**
 * @openapi
 * /api/v1/identity/auth/login:
 *   post:
 *     tags: [Identity/Auth]
 *     summary: Authenticate with email + password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { description: Authenticated; returns user + tokens }
 *       401: { description: Invalid credentials }
 *       403: { description: Account disabled or locked }
 */
router.post('/login', authRateLimit('login'), validate({ body: loginSchema }), AuthController.login);

/**
 * Passwordless phone sign-in — the entry point for the Kitchen and Staff apps.
 * `verify` creates the account on first use and reports `isNewUser` so the
 * client can route a first-timer into onboarding instead of the app.
 *
 * @openapi
 * /api/v1/identity/auth/otp/request:
 *   post:
 *     tags: [Identity/Auth]
 *     summary: Send a one-time login code to a phone number
 *     description: Rate limited per IP + phone. Outside production the response echoes `devCode` so the flow is testable without an SMS provider.
 *     responses:
 *       200: { description: Code sent (expiry + resend cooldown) }
 *       429: { description: Cooldown active or too many codes requested }
 * /api/v1/identity/auth/otp/verify:
 *   post:
 *     tags: [Identity/Auth]
 *     summary: Verify a phone code and sign in (creates the account if new)
 *     responses:
 *       200: { description: user + tokens + isNewUser }
 *       401: { description: Code invalid or expired }
 *       429: { description: Too many incorrect attempts }
 */
router.post('/otp/request', authRateLimit('otp-request'), validate({ body: otpRequestSchema }), AuthController.requestOtp);
router.post('/otp/verify', authRateLimit('otp-verify'), validate({ body: otpVerifySchema }), AuthController.verifyOtp);

/**
 * @openapi
 * /api/v1/identity/auth/refresh:
 *   post:
 *     tags: [Identity/Auth]
 *     summary: Rotate access + refresh tokens
 *     responses:
 *       200: { description: New token pair }
 *       401: { description: Session expired or revoked }
 */
router.post('/refresh', authRateLimit('refresh'), validate({ body: refreshSchema }), AuthController.refresh);

/**
 * @openapi
 * /api/v1/identity/auth/password/forgot:
 *   post:
 *     tags: [Identity/Auth]
 *     summary: Request a password-reset token (always 202, no user enumeration)
 *     responses:
 *       202: { description: Reset requested (if the account exists) }
 */
router.post(
  '/password/forgot',
  authRateLimit('password-forgot'),
  validate({ body: requestPasswordResetSchema }),
  AuthController.requestPasswordReset,
);

/**
 * @openapi
 * /api/v1/identity/auth/password/reset:
 *   post:
 *     tags: [Identity/Auth]
 *     summary: Confirm a password reset with a token
 *     responses:
 *       200: { description: Password changed }
 *       422: { description: Invalid or expired token }
 */
router.post(
  '/password/reset',
  authRateLimit('password-reset'),
  validate({ body: confirmPasswordResetSchema }),
  AuthController.confirmPasswordReset,
);

// --- authenticated ---

/**
 * @openapi
 * /api/v1/identity/auth/me:
 *   get:
 *     tags: [Identity/Auth]
 *     security: [{ bearerAuth: [] }]
 *     summary: Current authenticated user
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Unauthenticated }
 */
router.get('/me', requireAuth, AuthController.me);

/**
 * @openapi
 * /api/v1/identity/auth/password/change:
 *   post:
 *     tags: [Identity/Auth]
 *     security: [{ bearerAuth: [] }]
 *     summary: Change own password (revokes all sessions)
 *     responses:
 *       200: { description: Password changed }
 *       422: { description: Current password incorrect }
 */
router.post(
  '/password/change',
  requireAuth,
  validate({ body: changePasswordSchema }),
  AuthController.changePassword,
);

/**
 * @openapi
 * /api/v1/identity/auth/logout:
 *   post:
 *     tags: [Identity/Auth]
 *     security: [{ bearerAuth: [] }]
 *     summary: Log out the current session
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', requireAuth, AuthController.logout);

/**
 * @openapi
 * /api/v1/identity/auth/logout-all:
 *   post:
 *     tags: [Identity/Auth]
 *     security: [{ bearerAuth: [] }]
 *     summary: Log out of every session
 *     responses:
 *       200: { description: All sessions revoked }
 */
router.post('/logout-all', requireAuth, AuthController.logoutAll);

export default router;
