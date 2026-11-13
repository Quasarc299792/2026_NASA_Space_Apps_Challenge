import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  use: { ...devices['Desktop Chrome'], locale: 'en-US', baseURL: 'http://127.0.0.1:5193', trace: 'retain-on-failure' },
  webServer: {
    env: { VITE_FIREBASE_EMULATORS: process.env.PLAYWRIGHT_EMULATORS === 'true' ? 'true' : 'false' },
    command: 'npm run dev -- --host 127.0.0.1 --port 5193 --strictPort',
    url: 'http://127.0.0.1:5193',
    reuseExistingServer: false,
  },
})
