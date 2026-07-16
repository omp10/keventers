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

/** What a new owner submits to get a kitchen (public application). */
export type RestaurantApplication = {
  restaurantName: string;
  ownerName: string;
  email: string;
  phone: string;
  line1?: string;
  city: string;
  state: string;
  pincode: string;
  /** Comma-separated — the backend splits it. */
  cuisines?: string;
};

export const kitchenOnboardingService = {
  getState: () => api.get<KitchenOnboardingState>('/restaurant/onboarding'),

  /**
   * Submit a PUBLIC restaurant application. The endpoint is multipart (it also
   * accepts a logo + documents), so the fields go through FormData. This creates
   * a PENDING application for admin review — it does not grant kitchen access.
   */
  register: (application: RestaurantApplication) => {
    const form = new FormData();
    Object.entries(application).forEach(([key, value]) => {
      if (value) form.append(key, String(value));
    });
    return api.upload<{ id: string; status: string }>('/public/register-restaurant', form, { skipAuth: true });
  },
};

