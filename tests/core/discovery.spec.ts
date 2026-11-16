import { test, expect } from '../../fixtures';
import { collections, products } from '../../data/catalog';

test.describe('Product discovery @core', () => {
  for (const [name, path] of Object.entries(collections)) {
    test(`collection "${name}" renders products`, async ({ collection }) => {
      const res = await collection.open(path);
      expect(res?.status()).toBe(200);
      await collection.expectHasProducts();
    });
  }

  test('collection product links resolve to live PDPs', async ({ collection, page }) => {
    await collection.open(collections.bestsellers);
    await collection.expectHasProducts();
    const handles = (await collection.productHandles()).slice(0, 8);
    for (const h of handles) {
      const res = await page.request.get(`/products/${h}.js`);
      expect(res.status(), h).toBe(200);
    }
  });

  test('search returns the hero product (Searchspring)', async ({ home, page }) => {
    await home.open();
    await home.header.search('unseen');
    await expect(page).toHaveURL(/search|q=unseen/i);
    await expect(page.locator(`#MainContent a[href*="/products/${products.hero.handle}"]`).first()).toBeVisible({ timeout: 20_000 });
  });

  test('a nonsense search shows an empty state, not an error', async ({ page }) => {
    const res = await page.goto('/search?q=zzqxqzz-no-results');
    expect(res?.status()).toBe(200);
    await expect(page.locator('#MainContent')).toBeVisible();
  });
});
