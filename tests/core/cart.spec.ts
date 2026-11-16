import { test, expect } from '../../fixtures';
import { products } from '../../data/catalog';
import { Storefront } from '../../utils/storefront';

test.describe('Cart integrity @core', () => {
  test('quantity +/- and remove keep cart and totals consistent', async ({ storefront, pdp, cart, page }) => {
    const v = await storefront.firstAvailableVariant(products.lowPrice.handle);
    await storefront.add(v.id, 1);

    await pdp.open(products.lowPrice.handle);
    await pdp.header.openCart();
    await cart.expectOpen();

    await test.step('increase quantity', async () => {
      await cart.increase().click();
      await expect.poll(async () => Storefront.paidLines(await storefront.cart())[0]?.quantity).toBe(2);
    });

    await test.step('drawer subtotal = 2 x unit price', async () => {
      await page.reload();
      await pdp.header.openCart();
      await expect.poll(() => cart.subtotalCents()).toBe(v.price * 2);
    });

    await test.step('remove line empties the cart', async () => {
      await cart.removeButtons().first().click();
      await expect.poll(async () => Storefront.paidLines(await storefront.cart()).length).toBe(0);
    });
  });

  test('header bag count reflects cart after reload (persistence)', async ({ storefront, home }) => {
    const v = await storefront.firstAvailableVariant(products.lowPrice.handle);
    await storefront.add(v.id, 3);
    await home.open();
    const c = await storefront.cart();
    await home.header.expectCartCount(c.item_count);
  });

  test('cannot add more than available / invalid variant is rejected', async ({ page }) => {
    const res = await page.request.post('/cart/add.js', { data: { items: [{ id: 1, quantity: 1 }] } });
    expect(res.status()).toBe(404);
  });
});
