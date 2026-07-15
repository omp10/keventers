import { RestaurantPaymentConfig } from '../models/restaurant-payment-config.model.js';

import { PaymentScopedRepository } from './payment-scoped.repository.js';

const SECRET_FIELDS = '+merchantIdEnc +apiKeyEnc +secretKeyEnc +webhookSecretEnc';

/**
 * Restaurant payment-config repository. Config is organization+restaurant scoped
 * (no branch). Encrypted credential fields are `select: false`; the
 * `*WithSecrets` methods explicitly opt in for the ONLY consumer that needs
 * them (the config service, which decrypts them to build a provider). DTOs never
 * expose these.
 */
export class ConfigRepository extends PaymentScopedRepository {
  constructor(model = RestaurantPaymentConfig) {
    super(model, { softDelete: true });
  }

  #base(scope, extra = {}) {
    return { organizationId: scope.organizationId, restaurantId: scope.restaurantId, ...extra };
  }

  existsByProvider(scope, provider) {
    return this.exists(this.#base(scope, { provider }));
  }

  findActiveForRestaurant(scope) {
    return this.find(this.#base(scope, { isActive: true }), { sort: '-isDefault' });
  }

  /** Load one provider's config WITH decrypted-ready ciphertext fields. */
  async findWithSecrets(scope, provider) {
    const doc = await this.model
      .findOne(this.#base(scope, { provider, deletedAt: { $in: [null, undefined] } }))
      .select(SECRET_FIELDS);
    return this.toDomain(doc);
  }

  /** Load the restaurant's default (or first active) config WITH secrets. */
  async findDefaultWithSecrets(scope) {
    const doc = await this.model
      .findOne(this.#base(scope, { isActive: true, deletedAt: { $in: [null, undefined] } }))
      .sort('-isDefault')
      .select(SECRET_FIELDS);
    return this.toDomain(doc);
  }

  clearDefaults(scope) {
    return this.model.updateMany(this.#base(scope, { isDefault: true }), { $set: { isDefault: false } });
  }
}

export const configRepository = new ConfigRepository();
export default configRepository;
