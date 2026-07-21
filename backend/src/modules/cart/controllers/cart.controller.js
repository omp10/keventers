import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { cartService } from '../services/cart.service.js';
import { buildGuestScope } from '../utils/tenant.util.js';

/** Cart tenancy comes from the verified guest token (req.guest), never the client. */
const scopeOf = (req) => buildGuestScope(req.guest);

/** Optimistic version: body.version or the `If-Match` header. */
const versionOf = (req) => {
  if (req.body?.version !== undefined) return req.body.version;
  const h = req.headers['if-match'];
  return h !== undefined ? Number(h) : undefined;
};

/** Idempotency key from the standard header. */
const idempotencyKeyOf = (req) => req.headers['idempotency-key'] || undefined;

const opts = (req) => ({ version: versionOf(req), idempotencyKey: idempotencyKeyOf(req) });

export const CartController = {
  create: asyncHandler(async (req, res) => {
    const data = await cartService.getOrCreateCart(scopeOf(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  get: asyncHandler(async (req, res) => {
    const data = await cartService.getActiveCart(scopeOf(req));
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await cartService.updateCart(scopeOf(req), req.body, opts(req));
    ApiResponse.success(res, { data });
  }),

  abandon: asyncHandler(async (req, res) => {
    const data = await cartService.abandonCart(scopeOf(req));
    ApiResponse.success(res, { data });
  }),

  addItem: asyncHandler(async (req, res) => {
    const data = await cartService.addItem(scopeOf(req), req.body, opts(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  updateItem: asyncHandler(async (req, res) => {
    const data = await cartService.updateItem(scopeOf(req), req.params.id, req.body, opts(req));
    ApiResponse.success(res, { data });
  }),

  removeItem: asyncHandler(async (req, res) => {
    const data = await cartService.removeItem(scopeOf(req), req.params.id, opts(req));
    ApiResponse.success(res, { data });
  }),

  applyCoupon: asyncHandler(async (req, res) => {
    const data = await cartService.applyCoupon(scopeOf(req), req.body.code, opts(req));
    ApiResponse.success(res, { data });
  }),

  removeCoupon: asyncHandler(async (req, res) => {
    const data = await cartService.removeCoupon(scopeOf(req), opts(req));
    ApiResponse.success(res, { data });
  }),

  availableCoupons: asyncHandler(async (req, res) => {
    const data = await cartService.availableCoupons(scopeOf(req));
    ApiResponse.success(res, { data });
  }),

  recalculate: asyncHandler(async (req, res) => {
    const data = await cartService.recalculate(scopeOf(req), opts(req));
    ApiResponse.success(res, { data });
  }),

  lockForCheckout: asyncHandler(async (req, res) => {
    const data = await cartService.lockForCheckout(scopeOf(req));
    ApiResponse.success(res, { data });
  }),
};

export default CartController;
