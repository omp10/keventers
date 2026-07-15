import { DomainEvent } from '#core/eventbus/index.js';

export const ORG_EVENTS = Object.freeze({
  ORGANIZATION_REGISTERED: 'organization.registered',
  ORGANIZATION_APPROVED: 'organization.approved',
  ORGANIZATION_REJECTED: 'organization.rejected',
  ORGANIZATION_ACTIVATED: 'organization.activated',
  ORGANIZATION_SUSPENDED: 'organization.suspended',
  INFORMATION_REQUESTED: 'organization.information_requested',
  RESTAURANT_CREATED: 'restaurant.created',
  RESTAURANT_UPDATED: 'restaurant.updated',
  RESTAURANT_ACTIVATED: 'restaurant.activated',
  RESTAURANT_SUSPENDED: 'restaurant.suspended',
  BRANCH_CREATED: 'branch.created',
  BRANCH_UPDATED: 'branch.updated',
  ONBOARDING_STARTED: 'restaurant.onboarding_started',
  ONBOARDING_COMPLETED: 'restaurant.onboarding_completed',
});

export class OrganizationRegisteredEvent extends DomainEvent {
  static eventName = ORG_EVENTS.ORGANIZATION_REGISTERED;
}
export class OrganizationApprovedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.ORGANIZATION_APPROVED;
}
export class OrganizationRejectedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.ORGANIZATION_REJECTED;
}
export class OrganizationActivatedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.ORGANIZATION_ACTIVATED;
}
export class OrganizationSuspendedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.ORGANIZATION_SUSPENDED;
}
export class InformationRequestedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.INFORMATION_REQUESTED;
}
export class RestaurantCreatedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.RESTAURANT_CREATED;
}
export class RestaurantUpdatedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.RESTAURANT_UPDATED;
}
export class RestaurantActivatedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.RESTAURANT_ACTIVATED;
}
export class RestaurantSuspendedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.RESTAURANT_SUSPENDED;
}
export class BranchCreatedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.BRANCH_CREATED;
}
export class BranchUpdatedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.BRANCH_UPDATED;
}
export class OnboardingStartedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.ONBOARDING_STARTED;
}
export class OnboardingCompletedEvent extends DomainEvent {
  static eventName = ORG_EVENTS.ONBOARDING_COMPLETED;
}
