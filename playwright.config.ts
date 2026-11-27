import { defineConfig, devices } from '@playwright/test';

// Smoke tests run against the production build, served by `vite preview`.
export default defineConfig({
  testDir: 'e2e',
  // Measurements run separately with `npm run perf` (playwright.perf.config.ts).
  testIgnore: '**/perf/**',
  fullyParallel: true,
  // CI renders WebGL on the CPU: one worker keeps two scenes from sharing it, and the longer
  // test timeout covers the walks the specs give longer on CI (`slow()` in smoke.spec.ts).
  ...(process.env.CI ? { workers: 1 } : {}),
  timeout: process.env.CI ? 120_000 : 30_000,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
