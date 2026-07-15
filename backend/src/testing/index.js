/**
 * Testing foundation — public barrel. Import test doubles and helpers from here.
 */
export { applyTestEnv } from './test-bootstrap.js';
export { createMockContainer, Container } from './mock-container.js';
export { MockRepository } from './repository.mock.js';
export { MockRedis } from './mock-redis.js';
export {
  buildTestApp,
  connectTestInfra,
  disconnectTestInfra,
  clearDatabase,
} from './integration.helpers.js';
