import { test, expect } from '../../fixtures';
import { products, promos } from '../../data/catalog';

/** Subscribe & Save is powered by Skio selling plans: 10% off + free shipping. */
test.describe('Subscribe & Save @core @subscription', () => {
  test('hero product exposes Skio plans at the advertised discount', async ({ storefront }) => {
    const p = await storefront.product(products.hero.handle);
    const group = p.selling_plan_groups.find((g) => g.app_id === promos.subscription.appId);
    expect(group, 'Skio selling plan group').toBeTruthy();
    for (const plan of group!.selling_plans) {
      expect(plan.price_adjustments[0], plan.name).toMatchObject({ value_type: 'percentage', value: promos.subscription.discountPct });
    }
  });

  test('choosing Subscribe & Save discounts the price and adds a subscription line', async ({ storefront, pdp }) => {
    const v = await storefront.firstAvailableVariant(products.hero.handle, products.hero.sizeOption);
    const expected = Math.round(v.price * (1 - promos.subscription.discountPct / 100));

    await pdp.open(products.hero.handle);
    await pdp.selectSize(products.hero.sizeOption);
    await pdp.chooseSubscription();
    await expect(pdp.subscribe()).toBeVisible();
    await expect.poll(() => pdp.buttonPriceCents()).toBe(expected);

    await pdp.addToCart();
    await expect
      .poll(async () => (await storefront.cart()).items.find((i) => i.variant_id === v.id)?.selling_plan_allocation?.selling_plan.name ?? null)
      .not.toBeNull();
  });
});
