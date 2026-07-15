/**
 * Organization / Restaurant / Onboarding constants. This module owns these.
 */

/** Onboarding application review lifecycle. */
export const APPLICATION_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

/** Organization operational lifecycle (post-approval). */
export const ORGANIZATION_STATUS = Object.freeze({
  ONBOARDING: 'onboarding',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
});

/** Restaurant operational lifecycle. */
export const RESTAURANT_STATUS = Object.freeze({
  ONBOARDING: 'onboarding',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
});

export const BRANCH_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
});

/** Full lifecycle enum (union) used for validation/reference. */
export const LIFECYCLE_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ONBOARDING: 'onboarding',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
});

export const SUBSCRIPTION_STATUS = Object.freeze({
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

export const SUBSCRIPTION_PLAN = Object.freeze({
  TRIAL: 'trial',
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
});

export const RESTAURANT_TYPE = Object.freeze({
  QSR: 'qsr',
  CASUAL_DINING: 'casual_dining',
  FINE_DINING: 'fine_dining',
  CAFE: 'cafe',
  CLOUD_KITCHEN: 'cloud_kitchen',
  BAKERY: 'bakery',
  FOOD_TRUCK: 'food_truck',
  DESSERT: 'dessert',
});

/** Roles (names match the identity seeder's roles). */
export const ORG_ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ORGANIZATION_ADMIN: 'organization_admin',
  RESTAURANT_MANAGER: 'restaurant_manager',
  BRANCH_MANAGER: 'branch_manager',
  STAFF: 'staff',
});

/** Membership scope levels. */
export const MEMBERSHIP_SCOPE = Object.freeze({
  ORGANIZATION: 'organization',
  RESTAURANT: 'restaurant',
  BRANCH: 'branch',
});

export const MEMBERSHIP_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
});

/** First-login onboarding wizard steps. */
export const ONBOARDING_STEPS = Object.freeze([
  'logo',
  'business_hours',
  'currency',
  'taxes',
  'timezone',
  'qr_settings',
  'table_count',
  'staff_invitation',
  'payment_gateway',
  'notification_settings',
]);

export const DAYS_OF_WEEK = Object.freeze([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

/** Permissions specific to this module (registered with the RBAC platform). */
export const ORG_PERMISSIONS = Object.freeze({
  ONBOARDING_READ: 'onboarding:read',
  ONBOARDING_REVIEW: 'onboarding:review',
  ONBOARDING_APPROVE: 'onboarding:approve',
  ORGANIZATION_READ: 'organization:read',
  ORGANIZATION_CREATE: 'organization:create',
  ORGANIZATION_UPDATE: 'organization:update',
  ORGANIZATION_DELETE: 'organization:delete',
  RESTAURANT_READ: 'restaurant:read',
  RESTAURANT_UPDATE: 'restaurant:update',
  BRANCH_READ: 'branch:read',
  BRANCH_CREATE: 'branch:create',
  BRANCH_UPDATE: 'branch:update',
  BRANCH_DELETE: 'branch:delete',
  SUBSCRIPTION_READ: 'subscription:read',
  SUBSCRIPTION_MANAGE: 'subscription:manage',
});

export const STORAGE_FOLDERS = Object.freeze({
  LOGOS: 'organizations/logos',
  DOCUMENTS: 'organizations/documents',
  RESTAURANT_IMAGES: 'restaurants/images',
});

export const ORG_CACHE = Object.freeze({
  MEMBERSHIP_PREFIX: 'membership',
  MEMBERSHIP_TTL_SECONDS: 300,
});

export const ORG_ERRORS = Object.freeze({
  APPLICATION_NOT_FOUND: 'Onboarding application not found',
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  RESTAURANT_NOT_FOUND: 'Restaurant not found',
  BRANCH_NOT_FOUND: 'Branch not found',
  EMAIL_TAKEN: 'An application or account already exists for this email',
  INVALID_TRANSITION: 'Invalid status transition',
  NOT_APPROVABLE: 'Application is not in a reviewable state',
  ALREADY_PROCESSED: 'Application has already been processed',
  CROSS_TENANT: 'Access to this organization is not allowed',
  NO_TENANT: 'No organization membership found for this account',
  ONBOARDING_INCOMPLETE: 'Onboarding is not yet complete',
});
