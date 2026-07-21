import { BaseService } from '#core/service/base.service.js';
import { BadRequestError, NotFoundError } from '#core/errors/app-error.js';
import { encryptionService } from '#core/security/encryption.service.js';
import { config } from '#config';

import { PAYMENT_ERRORS } from '../constants/payment.constants.js';
import { toConfigDTO } from '../dto/payment.dto.js';
import { configRepository } from '../repositories/config.repository.js';
import { providerFactory } from '../providers/provider.factory.js';
import { entityId } from '../utils/id.util.js';
import { assertStaffAccess, resolveRestaurantScope } from '../utils/tenant.util.js';

/**
 * Restaurant payment-provider configuration. Owns credential ENCRYPTION (never
 * plaintext at rest) and, critically, `resolveProvider()` — the ONLY place that
 * decrypts credentials, instantiates a provider via the factory, and hands the
 * PaymentService a ready adapter. The PaymentService therefore never sees
 * secrets and never learns which gateway it is using.
 */
export class PaymentConfigService extends BaseService {
  constructor({ configs = configRepository, factory = providerFactory, encryption = encryptionService, platformProviders = config.payment.platformProviders, eventBus } = {}) {
    super({ name: 'payment.config', eventBus });
    this.configs = configs;
    this.factory = factory;
    this.encryption = encryption;
    // { razorpay: {merchantId, secretKey, ...} } from .env — the fallback when a
    // restaurant hasn't onboarded its own gateway. `{}` when no keys are set.
    this.platformProviders = platformProviders ?? {};
  }

  #enc(v) {
    return v == null || v === '' ? null : this.encryption.encrypt(String(v));
  }
  #dec(v) {
    return v ? this.encryption.decrypt(v) : null;
  }

  async createConfig(tenant, restaurantId, data, actorId = null) {
    const scope = await resolveRestaurantScope(tenant, restaurantId);
    if (!this.factory.isSupported(data.provider)) throw new BadRequestError(PAYMENT_ERRORS.PROVIDER_NOT_SUPPORTED);
    if (data.isDefault) await this.configs.clearDefaults(scope);
    const config = await this.configs.create({
      organizationId: scope.organizationId,
      restaurantId: scope.restaurantId,
      provider: data.provider,
      environment: data.environment,
      merchantIdEnc: this.#enc(data.merchantId),
      apiKeyEnc: this.#enc(data.apiKey),
      secretKeyEnc: this.#enc(data.secretKey),
      webhookSecretEnc: this.#enc(data.webhookSecret),
      extra: data.extra ?? {},
      enabledMethods: data.enabledMethods ?? [],
      isActive: data.isActive ?? true,
      isDefault: data.isDefault ?? false,
    });
    this.audit.success('payment.config.created', { actorId, targetId: entityId(config), metadata: { provider: data.provider } });
    return toConfigDTO(config);
  }

  async listConfigs(tenant, restaurantId) {
    const scope = await resolveRestaurantScope(tenant, restaurantId);
    const configs = await this.configs.findActiveForRestaurant(scope);
    return configs.map(toConfigDTO);
  }

  async updateConfig(tenant, id, data, actorId = null) {
    const config = await this.configs.findById(id);
    if (!config) throw new NotFoundError(PAYMENT_ERRORS.CONFIG_NOT_FOUND);
    assertStaffAccess(tenant, config);
    const patch = {};
    if (data.environment !== undefined) patch.environment = data.environment;
    if (data.enabledMethods !== undefined) patch.enabledMethods = data.enabledMethods;
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    if (data.extra !== undefined) patch.extra = data.extra;
    if (data.merchantId !== undefined) patch.merchantIdEnc = this.#enc(data.merchantId);
    if (data.apiKey !== undefined) patch.apiKeyEnc = this.#enc(data.apiKey);
    if (data.secretKey !== undefined) patch.secretKeyEnc = this.#enc(data.secretKey);
    if (data.webhookSecret !== undefined) patch.webhookSecretEnc = this.#enc(data.webhookSecret);
    if (data.isDefault === true) {
      await this.configs.clearDefaults({ organizationId: String(config.organizationId), restaurantId: String(config.restaurantId) });
      patch.isDefault = true;
    }
    const updated = await this.configs.updateById(id, patch);
    this.audit.success('payment.config.updated', { actorId, targetId: id });
    return toConfigDTO(updated);
  }

  async deleteConfig(tenant, id, actorId = null) {
    const config = await this.configs.findById(id);
    if (!config) throw new NotFoundError(PAYMENT_ERRORS.CONFIG_NOT_FOUND);
    assertStaffAccess(tenant, config);
    await this.configs.softDeleteById(id);
    this.audit.success('payment.config.deleted', { actorId, targetId: id });
    return { id, deleted: true };
  }

  #credentials(config) {
    return {
      merchantId: this.#dec(config.merchantIdEnc),
      apiKey: this.#dec(config.apiKeyEnc),
      secretKey: this.#dec(config.secretKeyEnc),
      webhookSecret: this.#dec(config.webhookSecretEnc),
      environment: config.environment,
      extra: config.extra ?? {},
    };
  }

  /**
   * Resolve a ready provider adapter for a scope (decrypting credentials). The
   * ONLY decryption site. Returns { provider, config } — the caller (payment
   * service) never touches secrets.
   * @param {{organizationId,restaurantId}} scope
   * @param {string} [providerName] specific provider, else the restaurant default.
   */
  async resolveProvider(scope, providerName = null) {
    const config = providerName
      ? await this.configs.findWithSecrets(scope, providerName)
      : await this.configs.findDefaultWithSecrets(scope);
    if (config && config.isActive !== false) {
      const provider = this.factory.create(config.provider, this.#credentials(config));
      return { provider, config };
    }
    // No per-restaurant config → fall back to platform .env credentials. A
    // named provider must match what the platform actually has keys for; an
    // unspecified provider takes the one platform default (razorpay).
    const platform = this.platformProviders[providerName ?? 'razorpay'];
    if (platform) {
      const provider = this.factory.create(platform.provider, platform);
      // A config-shaped object so callers that read cfg.provider /
      // cfg.enabledMethods keep working; no DB row exists for this path.
      const cfg = {
        provider: platform.provider,
        environment: platform.environment,
        enabledMethods: platform.enabledMethods ?? [],
        isActive: true,
        isPlatform: true,
      };
      return { provider, config: cfg };
    }
    throw new BadRequestError(PAYMENT_ERRORS.CONFIG_NOT_FOUND);
  }
}

export const paymentConfigService = new PaymentConfigService();
export default paymentConfigService;
