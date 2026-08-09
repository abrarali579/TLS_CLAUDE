import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const HOST = '127.0.0.1';

/**
 * Real-browser tests. These cover what a simulated DOM cannot: does data
 * actually survive a reload, does a download really produce a file, does
 * printing really open a page.
 *
 * They run against the built single-file app, served over http so that browser
 * storage behaves exactly as it does for a person using the app.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // every test shares one browser profile and one database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Build first: without dist\ the preview server exits immediately and all
    // you see is an unhelpful timeout.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort --host ${HOST}`,
    // Bind and poll the same address. Left as "localhost", Windows resolves it
    // to IPv6 ::1 while Playwright polls IPv4 127.0.0.1, and they never meet —
    // which also looks like a plain timeout.
    url: `http://${HOST}:${PORT}/TimeLink-Suite.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Show the server's own output, so a real error is visible instead of hidden.
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
