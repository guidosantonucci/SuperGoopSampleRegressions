import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: CI,
  // Production storefront + ~40 third-party scripts: one retry absorbs genuine network noise,
  // anything flakier than that gets tagged @quarantine and fixed.
  retries: CI ? 1 : 0,
  // Be a polite guest on production: low concurrency.
  workers: CI ? 2 : 3,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI
    ? [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'on-failure' }]],
  grepInvert: /@quarantine/,
  use: {
    baseURL: env.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    // US storefront; Shopify Markets could otherwise geo-redirect CI runners.
    extraHTTPHeaders: { 'Accept-Language': 'en-US' },
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: {},
    },
    {
      name: 'desktop-chrome',
      testIgnore: /api\//,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-safari',
      testIgnore: /api\//,
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'desktop-firefox',
      testIgnore: /api\//,
      grep: /@core|@smoke/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
