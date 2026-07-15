import { logger } from '#core/logging/logger.js';

import { AuditHelper } from './audit.helper.js';
import { createCacheHelper } from './cache.helper.js';
import { createEventPublisher } from './event-publisher.helper.js';
import { buildPaginatedResponse } from './pagination-response.js';
import { RetryHelper } from './retry.helper.js';
import { TransactionWrapper } from './transaction.wrapper.js';
import { ValidationHelper } from './validation.helper.js';

/**
 * Optional base class bundling the reusable service utilities. Business
 * services MAY extend this (for ergonomic access to cache/events/audit/tx) or
 * simply compose the individual helpers — both are valid per Clean Architecture.
 *
 * It holds NO business logic and does NOT access MongoDB (that is the
 * repository's exclusive responsibility).
 */
export class BaseService {
  /**
   * @param {object} [options]
   * @param {string} [options.name]      Service name (for logs/cache namespace).
   * @param {object} [options.eventBus]
   */
  constructor({ name = 'service', eventBus } = {}) {
    this.name = name;
    this.logger = logger({ service: name });
    this.cache = createCacheHelper(name);
    this.events = createEventPublisher(eventBus);
    this.audit = AuditHelper;
    this.validation = ValidationHelper;
    this.retry = RetryHelper.withRetry;
  }

  /** Wrap a unit of work in a DB transaction. */
  withTransaction(work) {
    return TransactionWrapper.withTransaction(work);
  }

  /** Shape a repository PageResult into a transport-ready paginated payload. */
  paginated(pageResult, mapItem) {
    return buildPaginatedResponse(pageResult, mapItem);
  }
}

export default BaseService;
