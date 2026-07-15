/**
 * Module-local DI tokens. Business modules define their own tokens (the core
 * TOKENS registry stays platform-only) and register providers in the shared
 * container from identity.module.js.
 */
export const IDENTITY_TOKENS = Object.freeze({
  UserRepository: Symbol('identity.UserRepository'),
  RoleRepository: Symbol('identity.RoleRepository'),
  PermissionRepository: Symbol('identity.PermissionRepository'),
  StaffRepository: Symbol('identity.StaffRepository'),

  UserService: Symbol('identity.UserService'),
  AuthService: Symbol('identity.AuthService'),
  RoleService: Symbol('identity.RoleService'),
  PermissionService: Symbol('identity.PermissionService'),
  StaffService: Symbol('identity.StaffService'),
});
