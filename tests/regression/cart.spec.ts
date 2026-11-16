import { test, expect } from '../../fixtures';
import { products } from '../../data/catalog';
import { Storefront } from '../../utils/storefront';
import { tags } from '../../utils/flows';

test.describe('Cart (regression)', () => {
  test('CART-02 remove line empties the cart', tags('@regression', '@P1', '@CART-02'), async ({ storefront, pdp, cart }) => {
    const v = await storefront.firstAvailableVariant(products.lowPrice.handle);
    await storefront.add(v.id, 1);
    await pdp.open(products.lowPrice.handle);
    await pdp.header.openCart();
    await cart.expectOpen();
    await cart.removeButtons().first().click();
    await expect.poll(async () => Storefront.paidLines(await storefront.cart()).length).toBe(0);
  });

  test('CART-03 bag count persists after reload', tags('@regression', '@P1', '@CART-03'), async ({ storefront, home }) => {
    const v = await storefront.firstAvailableVariant(products.lowPrice.handle);
    await storefront.add(v.id, 3);
    await home.open();
    await home.header.expectCartCount((await storefront.cart()).item_count);
  });

  test('CART-08 invalid variant is rejected by the cart API', tags('@regression', '@P2', '@CART-08'), async ({ page }) => {
    const res = await page.request.post('/cart/add.js', { data: { items: [{ id: 1, quantity: 1 }] } });
    expect(res.status()).toBe(404);
  });
});
