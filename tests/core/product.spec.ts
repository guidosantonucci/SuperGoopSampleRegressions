import { test, expect } from '../../fixtures';
import { activeIngredients, bestsellers, products } from '../../data/catalog';
import { tags } from '../../utils/flows';

test.describe('Product page', () => {
  test('PDP-01 bestseller product pages are buyable', tags('@core', '@P0', '@PDP-01'), async ({ pdp, page }) => {
    for (const handle of bestsellers) {
      await test.step(handle, async () => {
        const res = await pdp.open(handle);
        expect(res?.status(), `${handle} status`).toBe(200);
        await expect(pdp.title()).toBeVisible();
        await expect(pdp.addToBag()).toBeEnabled();
        expect(await pdp.buttonPriceCents(), `${handle} price`).toBeGreaterThan(0);
        await expect(page).toHaveTitle(/Supergoop/i);
      });
    }
  });

  test('PDP-02 size selection drives price, URL and variant', tags('@core', '@P0', '@PDP-02'), async ({ storefront, pdp, page }) => {
    const p = await storefront.product(products.hero.handle);
    await pdp.open(products.hero.handle);
    await pdp.chooseOneTime();

    for (const v of p.variants.filter((x) => x.available)) {
      await test.step(v.title, async () => {
        await pdp.selectSize(v.title);
        await expect(page).toHaveURL(new RegExp(`variant=${v.id}`));
        await expect.poll(() => pdp.buttonPriceCents()).toBe(v.price);
      });
    }
  });

  test('PDP-03 add to bag adds exactly what was selected', tags('@core', '@smoke', '@P0', '@PDP-03'), async ({ storefront, pdp, cart }) => {
    const p = await storefront.product(products.hero.handle);
    // Deliberately NOT the default size, so a "default variant always added" bug is caught.
    const target = p.variants.find((v) => v.available && v.title !== products.hero.sizeOption)!;

    await pdp.open(products.hero.handle);
    await pdp.selectSize(target.title);
    await pdp.chooseOneTime();
    const shown = await pdp.buttonPriceCents();
    await pdp.addToCart();

    await cart.expectOpen(1);
    const c = await storefront.cart();
    const line = c.items.find((i) => i.handle === products.hero.handle);
    expect(line?.variant_id, 'variant in cart').toBe(target.id);
    expect(line?.quantity).toBe(1);
    expect(line?.final_line_price, 'cart price = price shown on the button').toBe(shown);
    expect(line?.selling_plan_allocation, 'one-time purchase, no subscription').toBeFalsy();
  });

  test('PDP-04 shade and scent options add the chosen option', tags('@core', '@P0', '@PDP-04'), async ({ storefront, pdp }) => {
    for (const item of [products.shade, products.scent]) {
      await test.step(`${item.option}: ${item.value}`, async () => {
        await storefront.clear();
        await pdp.open(item.handle);
        await pdp.selectOption(item.option, item.value);
        await pdp.chooseOneTime().catch(() => {}); // not every product has a plan picker
        await pdp.addToCart();
        const line = (await storefront.cart()).items.find((i) => i.handle === item.handle);
        expect(line?.variant_title ?? '', 'cart line option').toContain(item.value);
      });
    }
  });

  test('PDP-07 Drug Facts (active ingredients) are present and correct', tags('@core', '@P0', '@PDP-07', '@compliance'), async ({ pdp }) => {
    for (const handle of bestsellers) {
      await test.step(handle, async () => {
        await pdp.open(handle);
        const actives = await pdp.activeIngredients();
        expect(actives, `${handle}: Active Ingredients section`).not.toBe('');
        expect(actives, `${handle}: each active has a %`).toMatch(/\d+(\.\d+)?%/);
        if (activeIngredients[handle]) expect(actives, `${handle}: approved copy`).toBe(activeIngredients[handle]);
      });
    }
  });

  test('PDP-08 bundle builder adds the chosen components at the shown price', tags('@core', '@P0', '@PDP-08'), async ({ storefront, pdp }) => {
    const { handle, choices } = products.bundle;
    await pdp.open(handle);
    for (const c of choices) await pdp.selectOption(c.option, c.value);
    const shown = await pdp.buttonPriceCents();
    await pdp.addToCart();

    const line = (await storefront.cart()).items.find((i) => i.handle === handle);
    for (const c of choices) expect(line?.variant_title ?? '', c.option).toContain(c.value);
    // Bundle carries its own discount ($75 -> $67.50 today): compare with what the shopper saw.
    expect(line?.final_line_price, 'cart price = price shown on the page').toBe(shown);
  });
});
