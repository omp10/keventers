import { getQueue } from './queue.factory.js';

/**
 * Job scheduling helpers over BullMQ: immediate enqueue, delayed jobs, and
 * repeatable (cron) jobs. Business jobs are added by modules later — these are
 * the reusable primitives.
 */
export const Scheduler = {
  /**
   * Enqueue a job to run as soon as a worker is free.
   * @param {string} queue
   * @param {string} name
   * @param {object} data
   * @param {import('bullmq').JobsOptions} [options]
   */
  async enqueue(queue, name, data, options = {}) {
    return getQueue(queue).add(name, data, options);
  },

  /**
   * Enqueue a job to run after `delayMs`.
   */
  async enqueueDelayed(queue, name, data, delayMs, options = {}) {
    return getQueue(queue).add(name, data, { ...options, delay: delayMs });
  },

  /**
   * Register a repeatable job on a cron schedule.
   * @param {string} cron  e.g. '0 3 * * *'
   */
  async schedule(queue, name, data, cron, options = {}) {
    return getQueue(queue).add(name, data, { ...options, repeat: { pattern: cron } });
  },

  /** Remove a previously registered repeatable job by its key. */
  async removeRepeatable(queue, repeatKey) {
    return getQueue(queue).removeRepeatableByKey(repeatKey);
  },
};

export default Scheduler;
