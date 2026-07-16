import { asyncHandler } from '#core/http/async-handler.js';
import { ApiResponse } from '#core/http/api-response.js';

import { onboardingService } from '../services/onboarding.service.js';
import { onboardingFormConfigService } from '../services/onboarding-form-config.service.js';

/** Public onboarding controller. No auth — assembles the payload + files. */
export const PublicController = {
  getOnboardingForm: asyncHandler(async (_req, res) => {
    ApiResponse.success(res, { data: await onboardingFormConfigService.get({ publicOnly: true }) });
  }),
  registerRestaurant: asyncHandler(async (req, res) => {
    const b = req.body;
    const payload = {
      restaurantName: b.restaurantName,
      brandName: b.brandName,
      ownerName: b.ownerName,
      email: b.email,
      phone: b.phone,
      gstNumber: b.gstNumber,
      fssaiLicense: b.fssaiLicense,
      businessRegistration: b.businessRegistration,
      address: {
        line1: b.line1,
        line2: b.line2,
        city: b.city,
        state: b.state,
        country: b.country ?? 'India',
        pincode: b.pincode,
      },
      restaurantType: b.restaurantType,
      cuisines: b.cuisines,
      numberOfBranches: b.numberOfBranches,
    };
    const files = {
      logo: req.files?.logo?.[0],
      documents: req.files?.documents ?? [],
    };
    const data = await onboardingService.registerRestaurant(payload, files);
    ApiResponse.success(res, { data, statusCode: 201 });
  }),
};

export default PublicController;
