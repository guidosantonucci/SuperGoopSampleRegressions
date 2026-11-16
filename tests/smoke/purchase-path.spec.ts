import { test, expect } from '../../fixtures';
import { products } from '../../data/catalog';

/**
 * The critical revenue path, mirrors the manual walkthrough:
 * PDP -> pick size -> one-time purchase -> Add to bag -> drawer -> Check out -> Shopify checkout.
 * Stops BEFORE payment on production.
 */
test('hero product can be bought up to the payment step @smoke', async ({ pdp, cart, checkout, storefront, page }) => {
  const { handle, title, sizeOption } = products.hero;
  const variant = await storefront.firstAvailableVariant(handle, sizeOption);

  await test.step('open PDP', async () => {
    await pdp.open(handle);
    await expect(pdp.title()).toContainText(new RegExp(title, 'i'));
  });

  await test.step('select size + one-time purchase', async () => {
    await pdp.selectSize(sizeOption);
    await pdp.chooseOneTime();
    expect(await pdp.buttonPriceCents(), 'button price = catalog price').toBe(variant.price);
  });

  await test.step('add to bag', async () => {
    await pdp.addToCart();
    await cart.expectOpen(1);
    const c = await storefront.cart();
    expect(c.items.find((i) => i.variant_id === variant.id)?.quantity).toBe(1);
  });

  await test.step('drawer -> checkout', async () => {
    await cart.goToCheckout();
    await checkout.expectLoaded();
    await checkout.expectLineItem(new RegExp(title, 'i'));
    await expect(checkout.payNow()).toBeEnabled();
  });

  await test.step('payment methods offered', async () => {
    for (const m of ['Credit card', 'Shop Pay', 'PayPal']) {
      await expect(page.getByText(m, { exact: false }).first(), m).toBeVisible();
    }
  });
});
