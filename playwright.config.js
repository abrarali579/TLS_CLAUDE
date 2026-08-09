import { defineConfig, devices } from '@playwright/test';

/**
 * Real-browser tests. These cover the things a simulated DOM cannot:
 * does data actually survive a reload, does a download really produce a file,
 * does printing really open a page.
 *
 * They run against the built single-file app, served over http so storage
 * behaves the same way it does for a person using it.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,   // every test shares one browser profile / one database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/TimeLink-Suite.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
