/**
 * @param {import('./env.schema.js').envSchema['_output']} env
 */
export function buildJobsConfig(env) {
  return {
    prefix: env.QUEUE_PREFIX,
    defaultJobOptions: {
      attempts: env.QUEUE_DEFAULT_ATTEMPTS,
      backoff: { type: 'exponential', delay: env.QUEUE_DEFAULT_BACKOFF_MS },
      removeOnComplete: env.QUEUE_REMOVE_ON_COMPLETE,
      removeOnFail: env.QUEUE_REMOVE_ON_FAIL,
    },
  };
}
