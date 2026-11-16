import { test as base, expect } from '@playwright/test';
import { env, SKIP } from '../config/env';
import { blockTrackers, IGNORED_CONSOLE_ERRORS } from '../utils/network';
import { Storefront } from '../utils/storefront';
import { AdminApi } from '../utils/adminApi';
import { Mailbox } from '../utils/mailbox';
import { HomePage } from '../pages/HomePage';
import { ProductPage } from '../pages/ProductPage';
import { CollectionPage } from '../pages/CollectionPage';
import { CartDrawer } from '../pages/CartDrawer';
import { CheckoutPage } from '../pages/CheckoutPage';
import { SubscriptionPortal } from '../pages/SubscriptionPortal';
import { AccountPage } from '../pages/AccountPage';
import { Newsletter } from '../pages/components/Newsletter';

type Options = {
  /** Block marketing pixels for this test. Override with test.use({ trackerBlocking: false }). */
  trackerBlocking: boolean;
};

type Fixtures = {
  storefront: Storefront;
  home: HomePage;
  pdp: ProductPage;
  collection: CollectionPage;
  cart: CartDrawer;
  checkout: CheckoutPage;
  newsletter: Newsletter;
  portal: SubscriptionPortal;
  account: AccountPage;
  /** First-party console errors collected during the test (third-party noise filtered). */
  consoleErrors: string[];
  /** Staging-only Admin API client. Skips the test when not configured. */
  adminApi: AdminApi;
  /** Mailosaur inbox. Skips the test when not configured. */
  inbox: Mailbox;
};

export const test = base.extend<Fixtures & Options>({
  trackerBlocking: [env.blockTrackers, { option: true }],

  // Runs for every UI test.
  page: async ({ page, trackerBlocking }, use) => {
    if (trackerBlocking) await blockTrackers(page);
    if (env.storefrontPassword) {
      await page.goto('/password');
      await page.getByLabel(/password/i).fill(env.storefrontPassword);
      await page.getByRole('button', { name: /enter/i }).click();
    }
    await use(page);
  },

  // Shares cookies with the page, so API-seeded carts show up in the UI.
  storefront: async ({ page }, use) => {
    const sf = new Storefront(page.request);
    await use(sf);
    await sf.clear().catch(() => {}); // teardown: leave no carts behind
  },

  consoleErrors: async ({ page, baseURL }, use) => {
    const errors: string[] = [];
    const host = new URL(baseURL!).hostname;
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const src = m.location().url ?? '';
      const firstParty = !src || src.includes(host) || src.includes('cdn.shopify.com');
      if (firstParty && !IGNORED_CONSOLE_ERRORS.some((r) => r.test(m.text()))) errors.push(m.text());
    });
    await use(errors);
  },

  adminApi: async ({}, use) => {
    test.skip(!env.hasAdminApi, SKIP.admin);
    const api = await AdminApi.create();
    await use(api);
    await api.dispose();
  },

  inbox: async ({}, use) => {
    test.skip(!env.hasInbox, SKIP.inbox);
    const mb = await Mailbox.create();
    await use(mb);
    await mb.dispose();
  },

  home: async ({ page }, use) => use(new HomePage(page)),
  pdp: async ({ page }, use) => use(new ProductPage(page)),
  collection: async ({ page }, use) => use(new CollectionPage(page)),
  cart: async ({ page }, use) => use(new CartDrawer(page)),
  checkout: async ({ page }, use) => use(new CheckoutPage(page)),
  newsletter: async ({ page }, use) => use(new Newsletter(page)),
  portal: async ({ page }, use) => use(new SubscriptionPortal(page)),
  account: async ({ page }, use) => use(new AccountPage(page)),
});

/** Call at the top of a staging-only test or describe. */
export function stagingOnly() {
  test.skip(!env.isStaging, SKIP.staging);
}

export { expect };
