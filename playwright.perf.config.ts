import { defineConfig } from '@playwright/test';
import base from './playwright.config.ts';

// `npm run perf`: the measurements in e2e/perf, one at a time so they don't compete for the GPU.
export default defineConfig({
  ...base,
  testDir: 'e2e/perf',
  testIgnore: [],
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
});
