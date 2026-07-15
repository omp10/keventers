import { config } from '#config';

/**
 * Reusable BullMQ retry/backoff policy presets. Job registrations pick a policy
 * instead of hand-specifying attempts/backoff everywhere.
 */
export const RetryPolicies = {
  none() {
    return { attempts: 1 };
  },

  standard() {
    return {
      attempts: config.jobs.defaultJobOptions.attempts,
      backoff: config.jobs.defaultJobOptions.backoff,
    };
  },

  aggressive() {
    return { attempts: 5, backoff: { type: 'exponential', delay: 1000 } };
  },

  custom({ attempts = 3, delayMs = 2000, type = 'exponential' } = {}) {
    return { attempts, backoff: { type, delay: delayMs } };
  },
};

export default RetryPolicies;
