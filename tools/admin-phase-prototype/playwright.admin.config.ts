import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  fullyParallel: false,
  reporter: 'list',
  webServer: {
    command: 'npm run admin:api',
    url: 'http://127.0.0.1:4100/admin/accounts/summary',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://127.0.0.1:4100',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
})
