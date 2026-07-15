/**
 * Module-local DI tokens for the organization module.
 */
export const ORG_TOKENS = Object.freeze({
  OnboardingApplicationRepository: Symbol('org.OnboardingApplicationRepository'),
  OrganizationRepository: Symbol('org.OrganizationRepository'),
  RestaurantRepository: Symbol('org.RestaurantRepository'),
  BranchRepository: Symbol('org.BranchRepository'),
  MembershipRepository: Symbol('org.MembershipRepository'),

  OnboardingService: Symbol('org.OnboardingService'),
  OrganizationService: Symbol('org.OrganizationService'),
  RestaurantService: Symbol('org.RestaurantService'),
  RestaurantOnboardingService: Symbol('org.RestaurantOnboardingService'),
  BranchService: Symbol('org.BranchService'),
  SubscriptionService: Symbol('org.SubscriptionService'),
  ProvisioningService: Symbol('org.ProvisioningService'),
  TenantService: Symbol('org.TenantService'),
  StaffService: Symbol('org.StaffService'),
});
