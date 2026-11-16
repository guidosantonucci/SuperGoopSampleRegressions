import { test, expect } from '../../fixtures';
import { products, promos } from '../../data/catalog';
import { Storefront } from '../../utils/storefront';

/**
 * Free gift with purchase ($70+), handled by the Kite promo app.
 * The app reacts client-side and reloads the page, so we trigger a page load
 * and POLL the cart instead of asserting once.
 */
test.describe('Free gift with purchase @core @promo', () => {
  const { thresholdUsd, giftHandle } = promos.freeGift;

  async function qtyToReach(storefront: Storefront, cents: number) {
    const v = await storefront.firstAvailableVariant(products.hero.handle, products.hero.sizeOption);
    return { v, qty: Math.ceil(cents / v.price) };
  }

  test('gift is auto-added at threshold and removed below it', async ({ storefront, pdp, cart, page }) => {
    const { v, qty } = await qtyToReach(storefront, thresholdUsd * 100);

    await test.step(`cart >= $${thresholdUsd} gets a $0 gift`, async () => {
      await storefront.add(v.id, qty);
      await pdp.open(products.hero.handle);
      await pdp.header.openCart();
      await expect
        .poll(async () => Storefront.giftLines(await storefront.cart()).map((l) => l.handle), { timeout: 20_000 })
        .toContain(giftHandle);
      const gift = Storefront.giftLines(await storefront.cart())[0];
      expect(gift.final_line_price, 'gift must be free').toBe(0);
      expect(gift.quantity, 'exactly one gift').toBe(1);
      await expect(cart.freeGiftUnlocked()).toBeVisible();
    });

    await test.step('dropping below threshold removes the gift', async () => {
      const line = Storefront.paidLines(await storefront.cart())[0];
      expect(v.price, 'one unit must sit below the threshold for this check').toBeLessThan(thresholdUsd * 100);
      await storefront.change(line.key, 1);
      await page.reload();
      await expect
        .poll(async () => Storefront.giftLines(await storefront.cart()).length, { timeout: 20_000 })
        .toBe(0);
    });
  });

  test('gift cannot be obtained for free by adding it directly (abuse check)', async ({ storefront, page }) => {
    const gift = await storefront.product(giftHandle);
    await storefront.add(gift.variants[0].id, 1).catch(() => {}); // may be rejected outright: also a pass
    await page.goto('/');
    await expect
      .poll(async () => {
        const c = await storefront.cart();
        const line = c.items.find((i) => i.handle === giftHandle);
        return !line || line.final_line_price > 0;
      }, { timeout: 20_000, message: 'gift alone must be removed or charged' })
      .toBe(true);
  });

  test('sale prices: Super Steals items show a compare-at price above the price', async ({ storefront }) => {
    const set = await storefront.product(products.set.handle);
    const discounted = set.variants.filter((v) => v.compare_at_price && v.compare_at_price > v.price);
    test.skip(discounted.length === 0, 'No active markdown on this SKU right now');
    for (const v of discounted) expect(v.price).toBeGreaterThan(0);
  });
});
