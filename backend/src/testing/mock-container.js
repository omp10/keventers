import { Container } from '#core/di/container.js';

/**
 * A DI container preconfigured for tests. Register mocks/fakes against the same
 * tokens the composition root uses, then resolve the unit under test with its
 * dependencies stubbed.
 *
 *   const c = createMockContainer();
 *   c.register(TOKENS.RedisClient, new MockRedis());
 *   c.register(TOKENS.Logger, () => silentLogger);
 */
export function createMockContainer(initial = {}) {
  const container = new Container();
  for (const [token, value] of Object.entries(initial)) {
    container.register(token, value);
  }
  return container;
}

export { Container };
export default createMockContainer;
