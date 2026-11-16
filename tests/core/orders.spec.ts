import { test, expect, stagingOnly } from '../../fixtures';
import { env, SKIP } from '../../config/env';
import { addresses } from '../../data/addresses';
import { products, promos } from '../../data/catalog';
import { money } from '../../utils/adminApi';
import { placeBogusOrder, seedCartAboveGiftThreshold, expectGift, tags } from '../../utils/flows';

/** Payments and post-purchase. Staging only (Bogus Gateway / sandboxes). */
test.describe('Payments and orders (staging)', () => {
  test.beforeEach(() => stagingOnly());

  test('PAY-01 approved card creates the order', tags('@core', '@P0', '@PAY-01', '@staging'), async ({ storefront, checkout, page }) => {
    await placeBogusOrder(page, storefront, checkout, addresses.newYork, '1');
    await expect(checkout.thankYou()).toBeVisible({ timeout: 60_000 });
    await expect(checkout.orderNumber()).toBeVisible();
  });

  test('PAY-02 declined card and gateway error let the shopper retry', tags('@core', '@P0', '@PAY-02', '@staging'), async ({ storefront, checkout, page }) => {
    for (const card of ['2', '3'] as const) {
      await test.step(card === '2' ? 'declined card' : 'gateway error', async () => {
        await storefront.clear();
        await placeBogusOrder(page, storefront, checkout, addresses.newYork, card);
        await expect(checkout.paymentError()).toBeVisible({ timeout: 30_000 });
        await expect(checkout.thankYou()).toBeHidden();
        await expect(checkout.payNow(), 'shopper can retry').toBeEnabled();
        expect((await storefront.cart()).item_count, 'cart kept').toBeGreaterThan(0);
      });
    }
  });

  test('PAY-03 PayPal completes an order', tags('@core', '@P0', '@PAY-03', '@staging'), async ({ storefront, checkout, page }) => {
    test.skip(!env.paypal.email || !env.paypal.password, SKIP.paypal);
    const v = await storefront.firstAvailableVariant(products.hero.handle, products.hero.sizeOption);
    await storefront.add(v.id, 1);
    await page.goto('/checkout');
    await checkout.expectLoaded();
    await checkout.fillShipping(addresses.newYork);
    await checkout.waitForShippingRates();
    await checkout.payWithPayPalSandbox(env.paypal.email, env.paypal.password);
    await expect(checkout.thankYou()).toBeVisible({ timeout: 90_000 });
  });

  // Shop Pay needs a real Shop account + one-time code: kept as a manual pre-release check.
  test.fixme('PAY-03b Shop Pay completes an order (manual)', tags('@core', '@P0', '@PAY-03', '@manual'), async () => {});

  test('ORD-02 confirmation email arrives and is correct', tags('@core', '@P0', '@ORD-02', '@staging'), async ({ storefront, checkout, inbox, page }, testInfo) => {
    const email = inbox.address('order', testInfo.workerIndex);
    const { variant } = await placeBogusOrder(page, storefront, checkout, { ...addresses.newYork, email }, '1');
    await expect(checkout.thankYou()).toBeVisible({ timeout: 60_000 });

    const msg = await inbox.waitFor(email, { timeoutMs: 5 * 60_000 });
    expect(msg.subject).toMatch(/order|confirm/i);
    expect(msg.html.body).toContain(products.hero.title);
    expect(msg.html.body).toContain(`$${(variant.price / 100).toFixed(2)}`);
  });

  test('ORD-03 order data is correct in Shopify Admin', tags('@core', '@P0', '@ORD-03', '@staging'), async ({ storefront, checkout, adminApi, page }) => {
    const email = `qa+ord03-${Date.now()}@example.com`;
    const { qty, variant } = await seedCartAboveGiftThreshold(storefront);
    await expectGift(page, storefront, true);
    const cart = await storefront.cart();

    await page.goto('/checkout');
    await checkout.expectLoaded();
    await checkout.fillShipping({ ...addresses.newYork, email });
    await checkout.waitForShippingRates();
    await checkout.payWithBogusGateway('1');
    await expect(checkout.thankYou()).toBeVisible({ timeout: 60_000 });

    let order: any = null;
    await expect.poll(async () => (order = await adminApi.latestOrderFor(email)) !== null, { timeout: 60_000 }).toBe(true);
    const lines = order.lineItems.nodes as any[];

    const hero = lines.find((l) => l.variant?.id === `gid://shopify/ProductVariant/${variant.id}`);
    expect(hero?.quantity, 'hero quantity').toBe(qty);

    const gift = lines.find((l) => l.customAttributes.some((a: any) => a.key === promos.freeGift.lineProperty && a.value === 'true'));
    expect(gift, 'gift line with _free_product property').toBeTruthy();
    expect(money(gift.discountedTotalSet), 'gift charged $0').toBe(0);

    expect(money(order.subtotalPriceSet), 'subtotal matches the cart').toBe(cart.total_price);
    expect(order.displayFinancialStatus).toMatch(/PAID|AUTHORIZED/);
  });
});
