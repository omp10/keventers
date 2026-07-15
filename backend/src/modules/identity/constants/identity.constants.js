/**
 * Identity module constants. Business-scoped; the module owns these.
 */
export const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  DISABLED: 'disabled',
  PENDING: 'pending',
  LOCKED: 'locked',
});

export const USER_TYPE = Object.freeze({
  CUSTOMER: 'customer',
  STAFF: 'staff',
});

export const STAFF_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
});

export const GENDER = Object.freeze({
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
  UNSPECIFIED: 'unspecified',
});

/** Identity permissions (resource:action) registered with the RBAC platform. */
export const IDENTITY_PERMISSIONS = Object.freeze({
  USER_READ: 'identity:user:read',
  USER_CREATE: 'identity:user:create',
  USER_UPDATE: 'identity:user:update',
  USER_DELETE: 'identity:user:delete',
  USER_DISABLE: 'identity:user:disable',
  USER_ASSIGN_ROLES: 'identity:user:assign-roles',
  USER_ASSIGN_PERMISSIONS: 'identity:user:assign-permissions',
  ROLE_READ: 'identity:role:read',
  ROLE_MANAGE: 'identity:role:manage',
  PERMISSION_READ: 'identity:permission:read',
  PERMISSION_MANAGE: 'identity:permission:manage',
  STAFF_READ: 'identity:staff:read',
  STAFF_MANAGE: 'identity:staff:manage',
});

/** Default role names seeded into the RBAC registry at module boot. */
export const DEFAULT_ROLE = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
});

/** Cache namespaces/keys owned by the identity module. */
export const IDENTITY_CACHE = Object.freeze({
  PASSWORD_RESET_PREFIX: 'pwreset',
  PASSWORD_RESET_TTL_SECONDS: 60 * 30, // 30 minutes
});

export const ACCOUNT_LOCK = Object.freeze({
  MAX_FAILED_ATTEMPTS: 5,
  LOCK_MINUTES: 15,
});

export const IDENTITY_ERRORS = Object.freeze({
  USER_NOT_FOUND: 'User not found',
  EMAIL_TAKEN: 'Email is already registered',
  PHONE_TAKEN: 'Phone number is already registered',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_DISABLED: 'Account is disabled',
  ACCOUNT_LOCKED: 'Account is temporarily locked',
  ROLE_NOT_FOUND: 'Role not found',
  ROLE_NAME_TAKEN: 'Role name already exists',
  PERMISSION_NOT_FOUND: 'Permission not found',
  PERMISSION_NAME_TAKEN: 'Permission name already exists',
  STAFF_NOT_FOUND: 'Staff record not found',
  EMPLOYEE_ID_TAKEN: 'Employee ID already exists',
  SYSTEM_ROLE_IMMUTABLE: 'System roles cannot be modified or deleted',
  CURRENT_PASSWORD_INVALID: 'Current password is incorrect',
});
