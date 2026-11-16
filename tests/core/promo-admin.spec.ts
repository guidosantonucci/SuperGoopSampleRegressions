import { test, expect, stagingOnly } from '../../fixtures';
import { products, promos } from '../../data/catalog';
import { tags } from '../../utils/flows';

/** Promotions that need the Admin API to set up. Staging only. */
test.describe('Promotions (staging, Admin API)', () => {
  test.beforeEach(() => stagingOnly());

  test('PROMO-09 scheduled promotion turns on and off on time', tags('@core', '@P0', '@PROMO-09', '@staging'), async ({ storefront, adminApi }) => {
    test.setTimeout(6 * 60_000);
    const title = `QA scheduled ${Date.now()}`;
    const startsAt = new Date(Date.now() + 60_000);
    const endsAt = new Date(Date.now() + 150_000);
    const id = await adminApi.createScheduledAutomatic({ title, percent: 0.15, startsAt, endsAt });

    try {
      const v = await storefront.firstAvailableVariant(products.hero.handle, products.hero.sizeOption);
      await storefront.add(v.id, 1);
      const hasPromo = async () => (await storefront.cart()).items.some((i) => i.discounts.some((d) => d.title === title));

      await test.step('not applied before start', async () => {
        expect(await hasPromo()).toBe(false);
      });
      await test.step('applied after start', async () => {
        await expect.poll(hasPromo, { timeout: 120_000, intervals: [5_000] }).toBe(true);
        const line = (await storefront.cart()).items[0];
        expect(line.final_line_price).toBe(Math.round(v.price * 0.85));
      });
      await test.step('removed after end, no leftover price', async () => {
        await expect.poll(hasPromo, { timeout: 150_000, intervals: [5_000] }).toBe(false);
        expect((await storefront.cart()).items[0].final_line_price).toBe(v.price);
      });
    } finally {
      await adminApi.deleteAutomaticDiscount(id);
    }
  });

  test('PROMO-12 discount codes follow the stacking rules', tags('@core', '@P0', '@PROMO-12', '@staging'), async ({ storefront, adminApi, checkout, page }) => {
    const code = `QA-STACK-${Date.now()}`;
    const percent = 0.1;
    const id = await adminApi.createPercentCode({
      code,
      percent,
      combinesWith: { productDiscounts: promos.codesCombineWithProductDiscounts },
    });

    try {
      // Super Steals set already carries an automatic product discount.
      const set = await storefront.firstAvailableVariant(products.set.handle);
      await storefront.add(set.id, 1);
      const line = (await storefront.cart()).items[0];
      const withMarkdown = line.final_line_price; // e.g. $99.16
      const codeOnly = Math.round(line.original_line_price * (1 - percent)); // e.g. $120.60
      const bothStacked = Math.round(withMarkdown * (1 - percent)); // e.g. $89.24

      await page.goto('/checkout');
      await checkout.expectLoaded();
      await checkout.applyCode(code);
      await page.waitForLoadState('networkidle').catch(() => {});

      const subtotal = (await checkout.summaryAmount(/^Subtotal/))!;
      const discount = (await checkout.summaryAmount(/^Discount|^Order discount/i)) ?? 0;
      const charged = subtotal - discount;

      if (promos.codesCombineWithProductDiscounts) {
        expect(charged, 'code stacks on top of the markdown').toBe(bothStacked);
      } else {
        expect(charged, 'never both discounts at once').toBeGreaterThanOrEqual(Math.min(withMarkdown, codeOnly));
        expect(charged).not.toBe(bothStacked);
      }
    } finally {
      await adminApi.deleteCodeDiscount(id);
    }
  });
});
