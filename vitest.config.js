import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // harness.js builds its own jsdom per test file
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
