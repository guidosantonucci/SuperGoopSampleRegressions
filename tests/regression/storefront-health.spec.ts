import { test, expect } from '../../fixtures';
import { navMenus } from '../../data/catalog';
import { tags } from '../../utils/flows';

test.describe('Storefront health', () => {
  test('NAV-01 homepage loads with header, nav and main content', tags('@regression', '@smoke', '@P1', '@NAV-01', '@PLAT-04'), async ({ home, page, consoleErrors }) => {
    const res = await home.open();
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Supergoop/);
    await expect(home.header.logo()).toBeVisible();
    await expect(home.header.cartButton()).toBeVisible();
    await expect(home.main()).toBeVisible();
    expect(consoleErrors, 'first-party JS errors').toEqual([]);
  });

  test('NAV-02 every top-level menu opens its mega menu', tags('@regression', '@P1', '@NAV-02'), async ({ home }) => {
    test.skip(home.header.isMobile(), 'Mobile nav is covered in navigation.spec');
    await home.open();
    for (const name of navMenus) {
      await test.step(name, async () => {
        await home.header.openMenu(name);
        await expect(home.header.menuTrigger(name)).toHaveAttribute('aria-expanded', 'true');
      });
    }
  });

  test('NAV-04 promo bar is present', tags('@regression', '@P1', '@NAV-04'), async ({ home }) => {
    await home.open();
    await expect(home.header.promoBar()).toBeVisible();
    await expect(home.header.promoBar()).not.toBeEmpty();
  });
});
