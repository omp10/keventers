import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { paymentConfigService } from '../services/payment-config.service.js';

import { actor, restaurantIdOf } from './_helpers.js';

/** Restaurant payment-provider configuration. Credentials are write-only —
 * encrypted at rest and NEVER returned. */
export const ConfigController = {
  create: asyncHandler(async (req, res) => {
    const data = await paymentConfigService.createConfig(req.tenant, restaurantIdOf(req), req.body, actor(req));
    ApiResponse.success(res, { data, statusCode: 201 });
  }),

  list: asyncHandler(async (req, res) => {
    const data = await paymentConfigService.listConfigs(req.tenant, restaurantIdOf(req));
    ApiResponse.success(res, { data });
  }),

  update: asyncHandler(async (req, res) => {
    const data = await paymentConfigService.updateConfig(req.tenant, req.params.id, req.body, actor(req));
    ApiResponse.success(res, { data });
  }),

  remove: asyncHandler(async (req, res) => {
    const data = await paymentConfigService.deleteConfig(req.tenant, req.params.id, actor(req));
    ApiResponse.success(res, { data });
  }),
};

export default ConfigController;
