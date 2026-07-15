import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Seed test env before any application module (and #config) is imported.
    setupFiles: ['./src/testing/test-bootstrap.js'],
    include: ['tests/**/*.test.js', 'src/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.js'],
      exclude: ['src/testing/**', 'src/**/index.js'],
    },
  },
  resolve: {
    // Mirror package.json "imports" subpath aliases for Vitest's resolver.
    alias: {
      '#config': new URL('./src/config/index.js', import.meta.url).pathname,
      '#core': new URL('./src/core', import.meta.url).pathname,
      '#platform': new URL('./src/platform', import.meta.url).pathname,
      '#modules': new URL('./src/modules', import.meta.url).pathname,
      '#api': new URL('./src/api', import.meta.url).pathname,
      '#middleware': new URL('./src/middleware', import.meta.url).pathname,
      '#routes': new URL('./src/routes', import.meta.url).pathname,
      '#database': new URL('./src/database', import.meta.url).pathname,
      '#testing': new URL('./src/testing', import.meta.url).pathname,
      '#shared': new URL('./src/shared', import.meta.url).pathname,
    },
  },
});
