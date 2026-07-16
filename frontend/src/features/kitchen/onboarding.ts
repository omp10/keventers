import { api } from '@/platform/api';

export type KitchenOnboardingState = {
  restaurantId: string;
  status: string;
  steps: string[];
  completedSteps: string[];
  pendingSteps: string[];
  started: boolean;
  completed: boolean;
};

export const kitchenOnboardingService = {
  getState: () => api.get<KitchenOnboardingState>('/restaurant/onboarding'),
};

