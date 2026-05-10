import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3001',
    headless: true,
  },
  projects: [
    {
      name: 'Chromium',
      use: { browserName: 'chromium' },
    },
  ],
  reporter: [
    ['json', { outputFile: 'reports/e2e-test-results.json' }],
    ['html', { open: 'never', outputDir: 'reports/playwright' }]
  ],
})
