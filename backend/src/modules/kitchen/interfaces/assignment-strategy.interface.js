/**
 * Auto-assignment strategy contract — an EXTENSION POINT. Manual and reassignment
 * are fully implemented in the ChefAssignmentService; automatic assignment is
 * kept behind this seam because it depends on a chef-roster / availability
 * source that a future Identity/Staff-scheduling module will provide. A concrete
 * strategy (round-robin, least-loaded, station-skill) is injected via DI without
 * touching the queue flow.
 */
export class AutoAssignmentStrategy {
  /* eslint-disable no-unused-vars, class-methods-use-this */
  /**
   * @param {object} entry   The kitchen queue entry needing a chef.
   * @param {object} context { candidateChefIds?: string[], loadByChef?: Record<string,number> }
   * @returns {Promise<string|null>} The chosen chef id, or null if none available.
   */
  async pick(entry, context) {
    throw new Error('AutoAssignmentStrategy.pick() not implemented');
  }
  /* eslint-enable no-unused-vars, class-methods-use-this */
}

/**
 * Default round-robin over an explicit candidate list (least-loaded first when
 * load counts are provided). Returns null when no candidates are supplied — so
 * auto-assignment is a safe no-op until a roster source is wired.
 */
export class RoundRobinAssignmentStrategy extends AutoAssignmentStrategy {
  async pick(_entry, context = {}) {
    const candidates = context.candidateChefIds ?? [];
    if (candidates.length === 0) return null;
    const load = context.loadByChef ?? {};
    return [...candidates].sort((a, b) => (load[a] ?? 0) - (load[b] ?? 0))[0];
  }
}

export const roundRobinAssignmentStrategy = new RoundRobinAssignmentStrategy();
export default AutoAssignmentStrategy;
