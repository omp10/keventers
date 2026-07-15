import { DomainEvent } from '#core/eventbus/index.js';

/**
 * Identity domain events. Past-tense, namespaced names. Other modules subscribe
 * via the event bus — never by importing identity internals.
 */
export const IDENTITY_EVENTS = Object.freeze({
  USER_CREATED: 'identity.user.created',
  USER_UPDATED: 'identity.user.updated',
  USER_DISABLED: 'identity.user.disabled',
  USER_ENABLED: 'identity.user.enabled',
  USER_DELETED: 'identity.user.deleted',
  PROFILE_UPDATED: 'identity.user.profile_updated',
  PASSWORD_CHANGED: 'identity.user.password_changed',
  PASSWORD_RESET_REQUESTED: 'identity.user.password_reset_requested',
  ROLE_ASSIGNED: 'identity.user.role_assigned',
  ROLE_REMOVED: 'identity.user.role_removed',
  PERMISSION_ASSIGNED: 'identity.user.permission_assigned',
  PERMISSION_REMOVED: 'identity.user.permission_removed',
  SESSION_REVOKED: 'identity.session.revoked',
  ROLE_CREATED: 'identity.role.created',
  ROLE_UPDATED: 'identity.role.updated',
  ROLE_DELETED: 'identity.role.deleted',
  PERMISSION_CREATED: 'identity.permission.created',
  STAFF_CREATED: 'identity.staff.created',
});

export class UserCreatedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.USER_CREATED;
}
export class UserUpdatedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.USER_UPDATED;
}
export class UserDisabledEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.USER_DISABLED;
}
export class UserEnabledEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.USER_ENABLED;
}
export class UserDeletedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.USER_DELETED;
}
export class ProfileUpdatedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.PROFILE_UPDATED;
}
export class PasswordChangedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.PASSWORD_CHANGED;
}
export class PasswordResetRequestedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.PASSWORD_RESET_REQUESTED;
}
export class RoleAssignedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.ROLE_ASSIGNED;
}
export class RoleRemovedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.ROLE_REMOVED;
}
export class PermissionAssignedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.PERMISSION_ASSIGNED;
}
export class PermissionRemovedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.PERMISSION_REMOVED;
}
export class SessionRevokedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.SESSION_REVOKED;
}
export class RoleCreatedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.ROLE_CREATED;
}
export class RoleUpdatedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.ROLE_UPDATED;
}
export class RoleDeletedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.ROLE_DELETED;
}
export class PermissionCreatedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.PERMISSION_CREATED;
}
export class StaffCreatedEvent extends DomainEvent {
  static eventName = IDENTITY_EVENTS.STAFF_CREATED;
}
