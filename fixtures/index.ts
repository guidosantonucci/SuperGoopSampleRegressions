import { test as base, expect } from '@playwright/test';
import { env } from '../config/env';
import { blockTrackers, IGNORED_CONSOLE_ERRORS } from '../utils/network';
import { Storefront } from '../utils/storefront';
import { HomePage } from '../pages/HomePage';
import { ProductPage } from '../pages/ProductPage';
import { CollectionPage } from '../pages/CollectionPage';
import { CartDrawer } from '../pages/CartDrawer';
import { CheckoutPage } from '../pages/CheckoutPage';

type Fixtures = {
  storefront: Storefront;
  home: HomePage;
  pdp: ProductPage;
  collection: CollectionPage;
  cart: CartDrawer;
  checkout: CheckoutPage;
  /** First-party console errors collected during the test (third-party noise filtered). */
  consoleErrors: string[];
};

export const test = base.extend<Fixtures>({
  // Auto fixture: runs for every UI test.
  page: async ({ page }, use) => {
    if (env.blockTrackers) await blockTrackers(page);
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

  home: async ({ page }, use) => use(new HomePage(page)),
  pdp: async ({ page }, use) => use(new ProductPage(page)),
  collection: async ({ page }, use) => use(new CollectionPage(page)),
  cart: async ({ page }, use) => use(new CartDrawer(page)),
  checkout: async ({ page }, use) => use(new CheckoutPage(page)),
});

export { expect };
