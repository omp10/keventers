import { BaseService } from '#core/service/base.service.js';

import { GuestToken } from '../utils/guest-token.util.js';

/**
 * Thin service wrapper around the GuestToken JWT utility, so the token
 * mechanism is injectable/mocked via the DI container and future modules resolve
 * it by token rather than importing the util directly.
 */
export class GuestTokenService extends BaseService {
  constructor({ token = GuestToken, eventBus } = {}) {
    super({ name: 'qr.guest-token', eventBus });
    this.token = token;
  }

  issue(claims) {
    return this.token.sign(claims);
  }

  verify(raw) {
    return this.token.verify(raw);
  }

  toGuest(decoded) {
    return this.token.toGuest(decoded);
  }
}

export const guestTokenService = new GuestTokenService();
export default guestTokenService;
