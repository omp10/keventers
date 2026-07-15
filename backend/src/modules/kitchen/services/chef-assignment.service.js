import { BaseService } from '#core/service/base.service.js';
import { BadRequestError } from '#core/errors/app-error.js';

import { ASSIGNMENT_MODE, KITCHEN_ERRORS } from '../constants/kitchen.constants.js';
import { roundRobinAssignmentStrategy } from '../interfaces/assignment-strategy.interface.js';

/**
 * Chef assignment. Manual assignment + reassignment are fully implemented;
 * automatic assignment delegates to a pluggable strategy (default round-robin,
 * a safe no-op until a chef-roster source is wired). The service only COMPUTES
 * the assignment object + validates it — the DB write is the KitchenService's
 * versioned transition, keeping one write path.
 */
export class ChefAssignmentService extends BaseService {
  constructor({ strategy = roundRobinAssignmentStrategy, eventBus } = {}) {
    super({ name: 'kitchen.chef-assignment', eventBus });
    this.strategy = strategy;
  }

  /** Build the assignment sub-document for a manual (re)assignment. */
  buildManual(chefId, actorId, now = new Date()) {
    if (!chefId) throw new BadRequestError(KITCHEN_ERRORS.CHEF_REQUIRED);
    return {
      mode: ASSIGNMENT_MODE.MANUAL,
      currentChefId: chefId,
      assignedBy: actorId,
      assignedAt: now,
    };
  }

  /** Attempt an automatic assignment; returns the assignment object or null. */
  async buildAuto(entry, context = {}, actorId = null, now = new Date()) {
    const chefId = await this.strategy.pick(entry, context);
    if (!chefId) return null;
    return {
      mode: ASSIGNMENT_MODE.AUTO,
      currentChefId: chefId,
      assignedBy: actorId,
      assignedAt: now,
    };
  }
}

export const chefAssignmentService = new ChefAssignmentService();
export default chefAssignmentService;
