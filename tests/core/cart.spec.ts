import { test, expect } from '../../fixtures';
import { products } from '../../data/catalog';
import { Storefront } from '../../utils/storefront';
import { tags } from '../../utils/flows';

test('CART-01 quantity changes recalculate the cart', tags('@core', '@smoke', '@P0', '@CART-01'), async ({ storefront, pdp, cart, page }) => {
  const v = await storefront.firstAvailableVariant(products.lowPrice.handle);
  await storefront.add(v.id, 1);

  await pdp.open(products.lowPrice.handle);
  await pdp.header.openCart();
  await cart.expectOpen();

  await test.step('+ raises quantity, line price and subtotal', async () => {
    await cart.increase().click();
    await expect.poll(async () => Storefront.paidLines(await storefront.cart())[0]?.quantity).toBe(2);
    await page.reload();
    await pdp.header.openCart();
    await expect.poll(() => cart.subtotalCents()).toBe(v.price * 2);
    await pdp.header.expectCartCount((await storefront.cart()).item_count);
  });

  await test.step('- lowers it back', async () => {
    await cart.decrease().click();
    await expect.poll(async () => Storefront.paidLines(await storefront.cart())[0]?.quantity).toBe(1);
    await page.reload();
    await pdp.header.openCart();
    await expect.poll(() => cart.subtotalCents()).toBe(v.price);
  });
});
