import { test, expect, stagingOnly } from '../../fixtures';
import { products, promos } from '../../data/catalog';
import { Storefront } from '../../utils/storefront';
import { expectGift, expectNoGiftAfterSettle, seedCartAboveGiftThreshold, tags } from '../../utils/flows';

/**
 * Free gift with purchase ($70+), added client-side by the Kite promo app as a $0 line
 * with property _free_product=true.
 */
test.describe('Free gift with purchase', () => {
  const { thresholdUsd, giftHandle } = promos.freeGift;

  test('PROMO-03 gift is added once at $0 when the cart reaches the threshold', tags('@core', '@P0', '@PROMO-03'), async ({ storefront, pdp, cart, checkout, page }) => {
    await seedCartAboveGiftThreshold(storefront);
    await expectGift(page, storefront, true);

    const gifts = Storefront.giftLines(await storefront.cart());
    expect(gifts, 'exactly one gift line').toHaveLength(1);
    expect(gifts[0].quantity, 'gift quantity').toBe(1);
    expect(gifts[0].final_line_price, 'gift is free').toBe(0);

    await pdp.open(products.hero.handle);
    await pdp.header.openCart();
    await expect(cart.freeGiftUnlocked()).toBeVisible();

    await page.goto('/checkout');
    await checkout.expectLoaded();
    await expect(page.getByText(/\(GIFT\)/i).first()).toBeVisible();
  });

  test('PROMO-04 threshold boundaries', tags('@core', '@P0', '@PROMO-04'), async ({ storefront, page }) => {
    const hero = await storefront.firstAvailableVariant(products.hero.handle, products.hero.sizeOption);
    const stick = await storefront.firstAvailableVariant(products.thirtyTwo.handle);
    const low = await storefront.firstAvailableVariant(products.lowPrice.handle);

    await test.step(`exactly $${thresholdUsd} gets the gift`, async () => {
      expect(hero.price + stick.price, 'test data must sum to the threshold').toBe(thresholdUsd * 100);
      await storefront.add(hero.id, 1);
      await storefront.add(stick.id, 1);
      await expectGift(page, storefront, true);
    });

    await test.step(`below $${thresholdUsd} gets no gift`, async () => {
      await storefront.clear();
      await storefront.add(hero.id, 1);
      await storefront.add(low.id, 1); // $38 + $16 = $54
      expect(hero.price + low.price).toBeLessThan(thresholdUsd * 100);
      await expectNoGiftAfterSettle(page, storefront);
    });
  });

  test('PROMO-06 gift cannot be obtained alone for free', tags('@core', '@P0', '@PROMO-06', '@security'), async ({ storefront, checkout, page }) => {
    const gift = await storefront.product(giftHandle);
    await storefront.add(gift.variants[0].id, 1).catch(() => {}); // rejected outright is also a pass
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect
      .poll(
        async () => {
          const line = (await storefront.cart()).items.find((i) => i.handle === giftHandle);
          return !line || line.final_line_price > 0;
        },
        { timeout: 20_000, message: 'gift alone must be removed or charged' },
      )
      .toBe(true);

    const line = (await storefront.cart()).items.find((i) => i.handle === giftHandle);
    if (line) {
      await page.goto('/checkout');
      await checkout.expectLoaded();
      expect(await checkout.summaryAmount(/^Subtotal/), 'never $0 at checkout').toBeGreaterThan(0);
    }
  });

  test('PROMO-07 gift out of stock does not break the cart', tags('@core', '@P1', '@PROMO-07', '@staging'), async ({ storefront, adminApi, page }) => {
    stagingOnly();
    const giftVariant = (await storefront.product(giftHandle)).variants[0];
    const inv = await adminApi.variantInventory(giftVariant.id);
    await adminApi.setAvailable(inv.inventoryItemId, inv.locationId, 0);
    try {
      await seedCartAboveGiftThreshold(storefront);
      await expectNoGiftAfterSettle(page, storefront);
      await page.goto('/checkout');
      await expect(page).toHaveURL(/\/checkouts?\//);
      await expect(page.getByRole('heading', { name: 'Payment' })).toBeVisible({ timeout: 30_000 });
    } finally {
      await adminApi.setAvailable(inv.inventoryItemId, inv.locationId, inv.available);
    }
  });

  test('GC-02 gift cards do not unlock the free gift', tags('@core', '@P0', '@GC-02', '@security'), async ({ storefront, page }) => {
    const gc = await storefront.product(products.giftCard.handle);
    const hundred = gc.variants.find((v) => v.title === '$100' && v.available);
    test.skip(!hundred, 'No $100 gift card variant available');
    await storefront.add(hundred!.id, 1);
    // $100 gift card alone: must not count toward the $70 threshold.
    await expectNoGiftAfterSettle(page, storefront);
  });
});
