import { test, expect } from '../../fixtures';
import { navMenus } from '../../data/catalog';

test.describe('Storefront health @smoke', () => {
  test('homepage loads with header, nav and main content', async ({ home, page, consoleErrors }) => {
    const res = await home.open();
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Supergoop/);
    await expect(home.header.logo()).toBeVisible();
    await expect(home.header.cartButton()).toBeVisible();
    await expect(home.main()).toBeVisible();
    expect(consoleErrors, 'first-party JS errors').toEqual([]);
  });

  test('every top-level menu opens its mega menu', async ({ home }) => {
    test.skip(home.header.isMobile(), 'Mobile nav is covered in navigation.spec');
    await home.open();
    for (const name of navMenus) {
      await test.step(name, async () => {
        await home.header.openMenu(name);
        await expect(home.header.menuTrigger(name)).toHaveAttribute('aria-expanded', 'true');
      });
    }
  });

  test('promo bar is present (campaign messaging is a revenue lever)', async ({ home }) => {
    await home.open();
    await expect(home.header.promoBar()).toBeVisible();
    await expect(home.header.promoBar()).not.toBeEmpty();
  });
});
