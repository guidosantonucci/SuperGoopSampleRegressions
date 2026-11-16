import { test, expect } from '../../fixtures';
import { env } from '../../config/env';
import { products } from '../../data/catalog';
import { Storefront } from '../../utils/storefront';

test.describe('Checkout @core @checkout', () => {
  test.beforeEach(async ({ storefront, page }) => {
    const v = await storefront.firstAvailableVariant(products.lowPrice.handle);
    await storefront.add(v.id, 2);
    await page.goto('/checkout');
  });

  test('cart contents and subtotal carry over to checkout', async ({ checkout, storefront, page }) => {
    await checkout.expectLoaded();
    const c = await storefront.cart();
    const subtotal = (c.items_subtotal_price / 100).toFixed(2);
    await expect(page.getByText(`$${subtotal}`).first()).toBeVisible();
    for (const line of Storefront.paidLines(c)) {
      await expect(page.getByText(String(line.quantity)).first()).toBeVisible();
    }
  });

  test('required-field validation blocks submission (no order placed)', async ({ checkout, page }) => {
    await checkout.expectLoaded();
    await checkout.submitExpectingValidation();
    for (const msg of ['Enter an email', 'Enter a last name', 'Enter an address', 'Enter a city', 'Enter a ZIP / postal code']) {
      await expect(page.getByText(msg).first(), msg).toBeVisible();
    }
    await expect(page).toHaveURL(/\/checkouts?\//);
  });

  test('invalid discount code is rejected', async ({ checkout, page }) => {
    await checkout.expectLoaded();
    await checkout.applyCode(`QA-INVALID-${Date.now()}`);
    await expect(page.getByText(/enter a valid discount code|isn.t valid|unable to find/i).first()).toBeVisible();
  });

  test('shipping methods appear for a valid US address', async ({ checkout, page }) => {
    await checkout.expectLoaded();
    await checkout.fillShipping();
    await expect(page.getByRole('heading', { name: 'Shipping method' })).toBeVisible();
    await expect(page.getByText(/enter your shipping address to view/i)).toBeHidden({ timeout: 20_000 });
  });

  test('full order with Bogus Gateway (staging only) @staging', async ({ checkout, page }) => {
    test.skip(!env.allowOrderPlacement || env.isProduction, 'Never place orders on production');
    await checkout.expectLoaded();
    await checkout.fillShipping();
    await checkout.payWithBogusGateway('1');
    await expect(page.getByText(/thank you/i)).toBeVisible({ timeout: 60_000 });
  });
});
