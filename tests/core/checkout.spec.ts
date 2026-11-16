import { test, expect } from '../../fixtures';
import { products } from '../../data/catalog';
import { addresses, taxExpectations } from '../../data/addresses';
import { escapeRegExp, expectGift, seedCartAboveGiftThreshold, tags } from '../../utils/flows';

test.describe('Checkout', () => {
  test('CHK-01 cart to checkout handoff is lossless', tags('@core', '@smoke', '@P0', '@CHK-01'), async ({ storefront, pdp, cart, checkout, page }) => {
    await seedCartAboveGiftThreshold(storefront); // triggers the auto-added gift
    const low = await storefront.firstAvailableVariant(products.lowPrice.handle);
    await storefront.add(low.id, 1);
    await expectGift(page, storefront, true);
    const c = await storefront.cart();

    await pdp.open(products.lowPrice.handle);
    await pdp.header.openCart();
    await cart.expectOpen();
    await cart.goToCheckout();
    await checkout.expectLoaded();

    for (const line of c.items) await checkout.expectLineItem(new RegExp(escapeRegExp(line.title.split(' - ')[0]), 'i'));
    expect(await checkout.summaryAmount(/^Subtotal/), 'subtotal').toBe(c.total_price);
    await expect(page.getByText(/\(GIFT\)/i).first(), 'gift line present').toBeVisible();
  });

  test('CHK-02 order summary math is correct', tags('@core', '@P0', '@CHK-02'), async ({ storefront, checkout, page }) => {
    const set = await storefront.firstAvailableVariant(products.set.handle); // carries an automatic discount
    const low = await storefront.firstAvailableVariant(products.lowPrice.handle);
    await storefront.add(set.id, 1);
    await storefront.add(low.id, 2);
    const c = await storefront.cart();

    await page.goto('/checkout');
    await checkout.expectLoaded();
    await checkout.fillShipping(addresses.newYork);
    await checkout.waitForShippingRates();
    await expect.poll(() => checkout.summaryAmount(/tax/i), { message: 'tax calculated' }).not.toBeNull();

    const s = await checkout.summary();
    expect(s.subtotal, 'subtotal = cart total after line discounts').toBe(c.total_price);
    expect(s.total, 'total = subtotal + shipping + tax').toBe((s.subtotal ?? 0) + (s.shipping ?? 0) + (s.tax ?? 0));
    const lineSavings = c.items.reduce((sum, l) => sum + (l.original_line_price - l.final_line_price), 0);
    if (lineSavings > 0) expect(s.savings, 'savings shown').toBe(lineSavings);
  });

  test('CHK-04 sales tax is calculated per state', tags('@core', '@P0', '@CHK-04'), async ({ storefront, checkout, page }) => {
    const v = await storefront.firstAvailableVariant(products.hero.handle, products.hero.sizeOption);
    await storefront.add(v.id, 1);

    for (const { address, expect: rule } of taxExpectations) {
      await test.step(`${address}: ${rule}`, async () => {
        await page.goto('/checkout');
        await checkout.expectLoaded();
        await checkout.fillShipping(addresses[address]);
        await checkout.waitForShippingRates();
        await expect.poll(() => checkout.summaryAmount(/tax/i), { timeout: 20_000 }).not.toBeNull();
        const tax = (await checkout.summaryAmount(/tax/i)) ?? -1;
        if (rule === 'zero') expect(tax, `${address} tax`).toBe(0);
        else expect(tax, `${address} tax`).toBeGreaterThan(0);
      });
    }
  });

  test('CHK-05 shipping methods and rates are offered', tags('@core', '@P0', '@CHK-05'), async ({ storefront, checkout, page }) => {
    const v = await storefront.firstAvailableVariant(products.hero.handle, products.hero.sizeOption);
    await storefront.add(v.id, 1);

    await test.step('contiguous US: standard + faster option with prices', async () => {
      await page.goto('/checkout');
      await checkout.expectLoaded();
      await checkout.fillShipping(addresses.newYork);
      await checkout.waitForShippingRates();
      const options = await checkout.shippingOptionTexts();
      expect(options.length, `options: ${options.join(' | ')}`).toBeGreaterThanOrEqual(1);
      for (const o of options) expect(o, 'every option shows a price or Free').toMatch(/\$\d|free/i);
    });

    for (const key of ['alaska', 'hawaii'] as const) {
      await test.step(`${key}: rates shown or clearly unavailable`, async () => {
        await page.goto('/checkout');
        await checkout.expectLoaded();
        await checkout.fillShipping(addresses[key]);
        const rates = checkout.shippingOptions().first();
        const unavailable = page.getByText(/no shipping|not available|doesn.t ship|can.t ship/i).first();
        await expect(rates.or(unavailable)).toBeVisible({ timeout: 30_000 });
      });
    }
  });
});
