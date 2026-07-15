import { BaseRepository } from '#core/repository/base.repository.js';

import { OnboardingApplication } from '../models/onboarding-application.model.js';

export class OnboardingApplicationRepository extends BaseRepository {
  constructor(model = OnboardingApplication) {
    super(model, {
      softDelete: true,
      searchableFields: ['restaurantName', 'brandName', 'ownerName', 'email', 'phone'],
    });
  }

  findByEmail(email, options = {}) {
    return this.findOne({ email: String(email).toLowerCase() }, options);
  }

  existsByEmail(email) {
    return this.exists({ email: String(email).toLowerCase() });
  }
}

export const onboardingApplicationRepository = new OnboardingApplicationRepository();
export default onboardingApplicationRepository;
