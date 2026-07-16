import { OnboardingFormConfig } from '../models/onboarding-form-config.model.js';

const CONFIG_KEY = 'restaurant-onboarding';

export const DEFAULT_ONBOARDING_FIELDS = [
  ['restaurantName', 'Restaurant name', 'text', true],
  ['ownerName', 'Owner name', 'text', true],
  ['email', 'Email', 'email', true],
  ['phone', 'Phone', 'text', true],
  ['city', 'City', 'text', true],
  ['state', 'State', 'text', true],
  ['pincode', 'Pincode', 'text', true],
  ['logo', 'Restaurant logo', 'file', false],
  ['documents', 'Compliance documents', 'file', false],
].map(([key, label, type, required], order) => ({
  key, label, type, required, order, phase: 'application', enabled: true,
  multiple: key === 'documents', acceptedFileTypes: type === 'file' ? ['image/*', 'application/pdf'] : [],
}));

export const onboardingFormConfigService = {
  async get({ publicOnly = false } = {}) {
    const config = await OnboardingFormConfig.findOne({ key: CONFIG_KEY }).lean();
    const fields = config?.fields?.length ? config.fields : DEFAULT_ONBOARDING_FIELDS;
    return {
      fields: fields
        .filter((field) => !publicOnly || field.enabled)
        .sort((a, b) => a.order - b.order),
      updatedAt: config?.updatedAt ?? null,
    };
  },

  async update(fields) {
    const normalized = fields.map((field, order) => ({ ...field, order }));
    const config = await OnboardingFormConfig.findOneAndUpdate(
      { key: CONFIG_KEY },
      { $set: { fields: normalized } },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    return { fields: config.fields, updatedAt: config.updatedAt };
  },
};

