import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // test/harness.js builds its own jsdom where needed
    include: ['test/**/*.test.js'],
    exclude: ['node_modules/**', 'dist/**', 'e2e/**'], // e2e/ belongs to Playwright
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
