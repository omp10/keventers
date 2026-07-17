import { api } from '@/platform/api';

/**
 * The wizard's steps, in the order the backend declares them
 * (`ONBOARDING_STEPS`). Every one must be submitted before `complete` will
 * activate the restaurant — the backend rejects a partial wizard.
 */
export const ONBOARDING_STEPS = [
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
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type KitchenOnboardingState = {
  restaurantId: string;
  status: string;
  steps: OnboardingStep[];
  completedSteps: OnboardingStep[];
  pendingSteps: OnboardingStep[];
  started: boolean;
  completed: boolean;
};

export type BusinessHour = { day: string; isOpen: boolean; open: string; close: string };
export type TaxRate = { name: string; percentage: number };

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

  /** Mark the wizard started. Idempotent — submitting a step also starts it. */
  start: () => api.post<KitchenOnboardingState>('/restaurant/onboarding/start'),

  /**
   * Apply ONE step. The backend merges `data` into the restaurant's settings (or
   * its primary branch, for hours/table count) and records the step as complete,
   * returning the fresh wizard state.
   */
  submitStep: (step: OnboardingStep, data: Record<string, unknown> = {}) =>
    api.post<KitchenOnboardingState>('/restaurant/onboarding/step', { step, data }),

  /**
   * Finalize: restaurant AND its organization become ACTIVE, which is what opens
   * the kitchen board. Rejects with 422 if any step is still outstanding.
   */
  complete: () => api.post<{ id: string; status: string }>('/restaurant/onboarding/complete'),

  /**
   * Create the tables the `table_count` step asked for.
   *
   * The wizard step only stores `settings.tableCount` — a NUMBER nothing acts
   * on. Without real Table rows every ordering path dead-ends on "This table is
   * not available for ordering", which sounds like the table is busy rather than
   * absent. Numbers already taken are skipped (409), so re-running is safe.
   */
  async createTables(count: number): Promise<{ created: number }> {
    const existing = await api
      .paginate<{ number: string }>('/restaurant/tables', { query: { limit: 100 } })
      .then((p) => new Set(p.items.map((t) => t.number)))
      .catch(() => new Set<string>());

    let created = 0;
    for (let i = 1; i <= count; i += 1) {
      const number = String(i);
      if (existing.has(number)) continue;
      try {
        await api.post('/restaurant/tables', { number, name: `Table ${i}`, seatingCapacity: 4 });
        created += 1;
      } catch {
        /* already there, or the branch rejects it — the wizard shouldn't die over one table */
      }
    }
    return { created };
  },

  /** Upload the restaurant logo via the Storage Platform (no provider keys client-side). */
  uploadLogo: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<{ url: string; key: string }>('/restaurant/media/upload', form, {
      query: { folder: 'restaurants/logos' },
      onUploadProgress: onProgress,
    });
  },

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

