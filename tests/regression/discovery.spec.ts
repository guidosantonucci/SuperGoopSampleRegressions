import { test, expect } from '../../fixtures';
import { collections } from '../../data/catalog';
import { tags } from '../../utils/flows';

test.describe('Discovery (regression)', () => {
  test('PLP-02 collection product links resolve to live products', tags('@regression', '@P1', '@PLP-02'), async ({ collection, page }) => {
    await collection.open(collections.bestsellers);
    await collection.expectHasProducts();
    for (const h of (await collection.productHandles()).slice(0, 8)) {
      expect((await page.request.get(`/products/${h}.js`)).status(), h).toBe(200);
    }
  });

  test('SRCH-04 nonsense search shows an empty state, not an error', tags('@regression', '@P2', '@SRCH-04'), async ({ page }) => {
    const res = await page.goto('/search?q=zzqxqzz-no-results');
    expect(res?.status()).toBe(200);
    await expect(page.locator('#MainContent')).toBeVisible();
  });
});
