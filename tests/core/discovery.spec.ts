import { test, expect } from '../../fixtures';
import { collections, products } from '../../data/catalog';
import { tags } from '../../utils/flows';

test.describe('Discovery', () => {
  for (const [name, path] of Object.entries(collections)) {
    test(`PLP-01 collection "${name}" renders products`, tags('@core', '@smoke', '@P0', '@PLP-01'), async ({ collection }) => {
      const res = await collection.open(path);
      expect(res?.status()).toBe(200);
      await collection.expectHasProducts();
    });
  }

  test('SRCH-01 search finds the hero product', tags('@core', '@smoke', '@P0', '@SRCH-01'), async ({ home, page }) => {
    await home.open();
    await home.header.search('unseen');
    await expect(page).toHaveURL(/search|q=unseen/i);
    await expect(page.locator(`#MainContent a[href*="/products/${products.hero.handle}"]`).first()).toBeVisible({ timeout: 20_000 });
  });

  test.describe('mobile', () => {
    // Viewport only (no isMobile), so this also runs on the Firefox project.
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('NAV-03 mobile navigation opens, navigates and closes', tags('@core', '@P0', '@NAV-03'), async ({ home, page }) => {
      await home.open();
      await test.step('open and close', async () => {
        await home.header.openMobileNav();
        await home.header.closeMobileNav();
      });
      await test.step('navigate to a collection', async () => {
        await home.header.openMobileNav();
        await expect(home.header.mobileNavLink('Bestsellers')).toBeVisible();
        await home.header.mobileNavLink('Body').click();
        await expect(page).toHaveURL(/\/collections\/body/);
      });
    });
  });
});
