import mongoose from 'mongoose';

import { baseSchemaOptions } from '../utils/schema.util.js';

const { Schema } = mongoose;

const fieldSchema = new Schema({
  key: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  phase: { type: String, enum: ['application', 'setup'], default: 'application' },
  type: { type: String, enum: ['text', 'email', 'number', 'textarea', 'select', 'file'], default: 'text' },
  required: { type: Boolean, default: false },
  enabled: { type: Boolean, default: true },
  helpText: { type: String, trim: true, default: '' },
  placeholder: { type: String, trim: true, default: '' },
  options: { type: [String], default: [] },
  acceptedFileTypes: { type: [String], default: [] },
  maxFileSizeMb: { type: Number, min: 1, max: 25, default: 5 },
  multiple: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, { _id: false });

const onboardingFormConfigSchema = new Schema({
  key: { type: String, unique: true, default: 'restaurant-onboarding' },
  fields: { type: [fieldSchema], default: [] },
}, baseSchemaOptions);

export const OnboardingFormConfig = mongoose.models.OnboardingFormConfig
  || mongoose.model('OnboardingFormConfig', onboardingFormConfigSchema);

