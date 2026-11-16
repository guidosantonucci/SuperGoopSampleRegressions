import { test, expect } from '../../fixtures';
import { products } from '../../data/catalog';

test('every size option shows the catalog price and updates the URL @core', async ({ storefront, pdp, page }) => {
  const p = await storefront.product(products.hero.handle);
  await pdp.open(products.hero.handle);
  await pdp.chooseOneTime();

  for (const v of p.variants.filter((x) => x.available)) {
    await test.step(v.title, async () => {
      await pdp.selectSize(v.title);
      await expect(page).toHaveURL(new RegExp(`variant=${v.id}`));
      await expect.poll(() => pdp.buttonPriceCents()).toBe(v.price);
    });
  }
});
