import { describe, expect, it } from 'vitest';

import { isMissingChunk } from './lazy-route';

/**
 * The whole recovery hinges on RECOGNISING the error, and browsers word it
 * differently — miss one and that browser's users hit the error boundary after
 * every deploy with no way back except a manual refresh.
 */
describe('isMissingChunk', () => {
  it('recognises Chrome/Edge', () => {
    expect(isMissingChunk(new Error('Failed to fetch dynamically imported module: https://x/assets/index-OotgCqfY.js'))).toBe(true);
  });

  it('recognises Firefox', () => {
    expect(isMissingChunk(new Error('error loading dynamically imported module'))).toBe(true);
  });

  it('recognises Safari', () => {
    expect(isMissingChunk(new Error('Importing a module script failed.'))).toBe(true);
  });

  it('recognises a stale preloaded stylesheet', () => {
    expect(isMissingChunk(new Error('Unable to preload CSS for /assets/index-abc.css'))).toBe(true);
  });

  it('leaves real application errors alone', () => {
    expect(isMissingChunk(new Error('c.map is not a function'))).toBe(false);
    expect(isMissingChunk(new Error('Network request failed'))).toBe(false);
  });

  it('never throws on odd input', () => {
    expect(isMissingChunk(undefined)).toBe(false);
    expect(isMissingChunk(null)).toBe(false);
    expect(isMissingChunk('just a string')).toBe(false);
  });
});
