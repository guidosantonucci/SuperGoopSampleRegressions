import { test, expect, stagingOnly } from '../../fixtures';
import { env, SKIP } from '../../config/env';
import { products, promos } from '../../data/catalog';
import { money } from '../../utils/adminApi';
import { tags } from '../../utils/flows';

/** Subscribe & Save, powered by Skio selling plans: 10% off + free shipping. */
test.describe('Subscriptions', () => {
  test('SUB-02 subscription carries through cart and checkout', tags('@core', '@P0', '@SUB-02'), async ({ storefront, pdp, checkout, page }) => {
    const v = await storefront.firstAvailableVariant(products.hero.handle, products.hero.sizeOption);
    const expected = Math.round(v.price * (1 - promos.subscription.discountPct / 100));

    await test.step('product page: 10% off and default frequency', async () => {
      await pdp.open(products.hero.handle);
      await pdp.selectSize(products.hero.sizeOption);
      await pdp.chooseSubscription();
      await expect.poll(() => pdp.buttonPriceCents()).toBe(expected);
      await expect(pdp.planPicker().getByText(promos.subscription.defaultFrequency).first()).toBeVisible();
    });

    await test.step('cart line holds the selling plan at the subscription price', async () => {
      await pdp.addToCart();
      const line = (await storefront.cart()).items.find((i) => i.variant_id === v.id)!;
      expect(line.selling_plan_allocation?.selling_plan.name, 'selling plan').toMatch(promos.subscription.defaultFrequency);
      expect(line.final_line_price).toBe(expected);
    });

    await test.step('checkout shows recurring terms and the subscription price', async () => {
      await page.goto('/checkout');
      await checkout.expectLoaded();
      await expect(page.getByText(/every 3 months|recurring|subscription/i).first()).toBeVisible();
      expect(await checkout.summaryAmount(/^Subtotal/)).toBe(expected);
    });
  });

  test('SUB-05 customer portal: skip, change frequency, cancel', tags('@core', '@P0', '@SUB-05', '@staging'), async ({ account, portal, page }) => {
    stagingOnly();
    test.skip(!env.user.email || !env.user.password, SKIP.account);
    // Precondition: the seeded account has an active subscription created for this test run.
    await account.login(env.user.email, env.user.password);
    await portal.open();

    await test.step('skip next order moves the next order date', async () => {
      const before = await portal.nextOrderText();
      await portal.skipButton().click();
      await portal.confirmButton().click();
      await expect.poll(() => portal.nextOrderText()).not.toBe(before);
    });

    await test.step('change frequency persists after reload', async () => {
      await portal.frequencyButton().click();
      await page.getByRole('option', { name: /every 2 months/i }).or(page.getByText(/every 2 months/i)).first().click();
      await portal.confirmButton().click();
      await page.reload();
      await expect(page.getByText(/every 2 months/i).first()).toBeVisible();
    });

    await test.step('cancel stops future orders', async () => {
      await portal.cancelButton().click();
      await portal.confirmButton().click();
      await page.reload();
      await expect(page.getByText(/cancell?ed/i).first()).toBeVisible();
    });
  });

  test('SUB-06 renewal order is charged correctly', tags('@core', '@P0', '@SUB-06', '@staging'), async ({ adminApi }) => {
    stagingOnly();
    // Precondition: trigger a renewal for the test subscription from the Skio dashboard
    // (Skio owns the subscription contracts, so a custom app can't bill them).
    const order = await adminApi.latestOrderTagged(process.env.SKIO_RENEWAL_TAG ?? 'Subscription Recurring Order');
    test.skip(!order, 'No renewal order found: trigger one from Skio first');

    expect(money(order.totalShippingPriceSet), 'renewals ship free').toBe(0);
    for (const li of order.lineItems.nodes) {
      const original = money(li.originalUnitPriceSet);
      const charged = money(li.discountedUnitPriceAfterAllDiscountsSet);
      expect(charged, `${li.title}: 10% off`).toBe(Math.round(original * (1 - promos.subscription.discountPct / 100)));
    }
  });
});
