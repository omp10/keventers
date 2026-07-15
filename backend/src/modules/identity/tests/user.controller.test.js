import { describe, it, expect, vi, afterEach } from 'vitest';

import { UserController } from '../controllers/user.controller.js';
import { userService } from '../services/user.service.js';

/**
 * Controller test: the controller must only delegate to the service and wrap
 * the result in the standard API response — no business logic.
 */
function fakeRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

afterEach(() => vi.restoreAllMocks());

describe('UserController', () => {
  it('create → 201 with standard success envelope, forwarding actor id', async () => {
    const spy = vi.spyOn(userService, 'createUser').mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const req = { body: { email: 'a@b.com' }, principal: { id: 'admin-1' } };
    const res = fakeRes();

    UserController.create(req, res, () => {});
    await flush();

    expect(spy).toHaveBeenCalledWith({ email: 'a@b.com' }, 'admin-1');
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({ id: 'u1', email: 'a@b.com' });
  });

  it('list → 200 delegating validated query to the service', async () => {
    const spy = vi
      .spyOn(userService, 'listUsers')
      .mockResolvedValue({ items: [], pagination: { total: 0 } });
    const req = { validatedQuery: { page: 2 }, principal: { id: 'admin-1' } };
    const res = fakeRes();

    UserController.list(req, res, () => {});
    await flush();

    expect(spy).toHaveBeenCalledWith({ page: 2 });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  it('forwards service errors to next()', async () => {
    vi.spyOn(userService, 'getUser').mockRejectedValue(new Error('boom'));
    const next = vi.fn();
    UserController.getById({ params: { id: 'x' }, principal: {} }, fakeRes(), next);
    await flush();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
