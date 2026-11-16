import { test, expect } from '../../fixtures';
import { products, promos } from '../../data/catalog';
import { addresses } from '../../data/addresses';
import { blockTrackers } from '../../utils/network';
import { Storefront } from '../../utils/storefront';
import { ProductPage } from '../../pages/ProductPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { tags } from '../../utils/flows';

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

test.describe('Pricing', () => {
  test('PROMO-02 pricing A/B test: each visitor sees one price end to end', tags('@core', '@P0', '@PROMO-02'), async ({ browser, baseURL }) => {
    // The live theme runs a pricing A/B test. Fresh visitors land in either arm; whichever
    // arm a visitor gets, product page, cart and checkout must agree.
    for (let visitor = 1; visitor <= 3; visitor++) {
      await test.step(`visitor ${visitor}`, async () => {
        const context = await browser.newContext({ baseURL });
        const page = await context.newPage();
        await blockTrackers(page);
        const pdp = new ProductPage(page);
        const sf = new Storefront(page.request);
        try {
          await pdp.open(products.hero.handle);
          await pdp.selectSize(products.hero.sizeOption);
          await pdp.chooseOneTime();
          const shown = await pdp.buttonPriceCents();
          await pdp.addToCart();

          const line = (await sf.cart()).items.find((i) => i.handle === products.hero.handle)!;
          expect(line.final_line_price, 'cart = product page').toBe(shown);

          await page.goto('/checkout');
          const checkout = new CheckoutPage(page);
          await checkout.expectLoaded();
          expect(await checkout.summaryAmount(/^Subtotal/), 'checkout = product page').toBe(shown);
        } finally {
          await context.close();
        }
      });
    }
  });

  test('PROMO-08 Super Steals markdown is shown and charged', tags('@core', '@P0', '@PROMO-08'), async ({ storefront, pdp, checkout, page }) => {
    const { handle, discountTitle } = products.set;
    const v = await storefront.firstAvailableVariant(handle);

    await test.step('cart applies the markdown', async () => {
      await storefront.add(v.id, 1);
    });
    const line = (await storefront.cart()).items.find((i) => i.handle === handle)!;
    test.skip(!line.discounts.some((d) => discountTitle.test(d.title)), 'No Super Steals markdown live on this set right now');
    expect(line.final_line_price).toBeLessThan(line.original_line_price);

    await test.step('product page shows sale price and struck original', async () => {
      await pdp.open(handle);
      await expect(page.getByText(usd(line.final_line_price)).first()).toBeVisible();
      await expect(page.getByText(usd(line.original_line_price).replace('.00', '')).first()).toBeVisible();
    });

    await test.step('checkout charges the sale price', async () => {
      await page.goto('/checkout');
      await checkout.expectLoaded();
      expect(await checkout.summaryAmount(/^Subtotal/)).toBe(line.final_line_price);
    });
  });

  test('PROMO-13 free shipping promise matches the shipping charge', tags('@core', '@P0', '@PROMO-13'), async ({ storefront, checkout, page }) => {
    const { freeOnAllOrders, freeThresholdUsd } = promos.shipping;
    const low = await storefront.firstAvailableVariant(products.lowPrice.handle);

    const shippingFor = async () => {
      await page.goto('/checkout');
      await checkout.expectLoaded();
      await checkout.fillShipping(addresses.newYork);
      await checkout.waitForShippingRates();
      await expect.poll(() => checkout.summaryAmount(/^Shipping$/)).not.toBeNull();
      return (await checkout.summaryAmount(/^Shipping$/))!;
    };

    await test.step(`cart under $${freeThresholdUsd}`, async () => {
      await storefront.add(low.id, 1);
      const shipping = await shippingFor();
      if (freeOnAllOrders) expect(shipping, 'promo bar promises free shipping on all orders').toBe(0);
      else expect(shipping, `paid shipping under $${freeThresholdUsd}`).toBeGreaterThan(0);
    });

    await test.step(`cart over $${freeThresholdUsd}`, async () => {
      const qty = Math.ceil((freeThresholdUsd * 100) / low.price);
      await storefront.clear();
      await storefront.add(low.id, qty);
      expect(await shippingFor(), `free shipping over $${freeThresholdUsd}`).toBe(0);
    });
  });
});
