import { test, expect } from '../../fixtures';
import { products } from '../../data/catalog';
import { tags } from '../../utils/flows';

test.describe('Checkout (regression)', () => {
  test.beforeEach(async ({ storefront, page }) => {
    const v = await storefront.firstAvailableVariant(products.lowPrice.handle);
    await storefront.add(v.id, 2);
    await page.goto('/checkout');
  });

  test('CHK-03 required-field validation blocks submission', tags('@regression', '@P1', '@CHK-03'), async ({ checkout, page }) => {
    await checkout.expectLoaded();
    await checkout.submitExpectingValidation();
    for (const msg of ['Enter an email', 'Enter a last name', 'Enter an address', 'Enter a city', 'Enter a ZIP / postal code']) {
      await expect(page.getByText(msg).first(), msg).toBeVisible();
    }
    await expect(page).toHaveURL(/\/checkouts?\//);
  });

  test('PROMO-11 invalid discount code is rejected', tags('@regression', '@P1', '@PROMO-11'), async ({ checkout, page }) => {
    await checkout.expectLoaded();
    await checkout.applyCode(`QA-INVALID-${Date.now()}`);
    await expect(page.getByText(/enter a valid discount code|isn.t valid|unable to find/i).first()).toBeVisible();
  });
});
