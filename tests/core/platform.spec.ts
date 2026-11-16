import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../fixtures';
import { marketingPixelHosts, products, shopperApps } from '../../data/catalog';
import { dataLayerEvents, ecommerceProducts } from '../../utils/analytics';
import { tags } from '../../utils/flows';

test.describe('Platform, compliance and tracking', () => {
  for (const [app, hosts] of Object.entries(shopperApps)) {
    test(`PLAT-02 shopper can still buy when ${app} fails`, tags('@core', '@P0', '@PLAT-02', '@resilience'), async ({ pdp, cart, storefront, checkout, page }) => {
      await page.route((url) => hosts.some((h) => url.hostname.endsWith(h)), (r) => r.abort('failed'));

      await pdp.open(products.hero.handle);
      await expect(pdp.addToBag()).toBeEnabled();
      await pdp.addToCart();
      expect((await storefront.cart()).item_count, 'item added').toBeGreaterThan(0);

      await pdp.header.openCart();
      await cart.expectOpen();
      await cart.goToCheckout();
      await checkout.expectLoaded();
    });
  }

  test.describe('consent', () => {
    // Pixels must be live for this test: we check that opting out silences them.
    test.use({ trackerBlocking: false, extraHTTPHeaders: { 'Accept-Language': 'en-US', 'Sec-GPC': '1' } });

    test('CMP-01 opted-out shoppers are not tracked by marketing pixels', tags('@core', '@P0', '@CMP-01', '@compliance'), async ({ pdp, page }) => {
      await page.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }));
      const fired: string[] = [];
      page.on('request', (r) => {
        if (marketingPixelHosts.some((h) => r.url().includes(h))) fired.push(new URL(r.url()).hostname);
      });

      await pdp.open(products.hero.handle);
      // Reject in the consent banner if one is shown (it isn't for most US visitors).
      const reject = page.getByRole('button', { name: /reject all|decline|do not sell/i }).first();
      if (await reject.isVisible().catch(() => false)) await reject.click();

      await pdp.addToCart();
      await page.waitForLoadState('networkidle').catch(() => {});
      expect([...new Set(fired)], 'marketing pixels fired despite GPC / opt-out').toEqual([]);
    });
  });

  test('CMP-02 key pages have no critical accessibility violations', tags('@core', '@P0', '@CMP-02', '@compliance', '@a11y'), async ({ pdp, cart, collection, home, page }, testInfo) => {
    const scan = async (name: string) => {
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      const critical = results.violations.filter((v) => v.impact === 'critical');
      const serious = results.violations.filter((v) => v.impact === 'serious');
      // Serious issues are reported, not failed, until the baseline is cleaned up.
      if (serious.length) testInfo.annotations.push({ type: `a11y serious (${name})`, description: serious.map((v) => `${v.id} x${v.nodes.length}`).join(', ') });
      expect(critical.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`), `${name}: critical violations`).toEqual([]);
    };

    await test.step('home', async () => {
      await home.open();
      await scan('home');
    });
    await test.step('collection', async () => {
      await collection.open('/collections/best-sellers-spf');
      await collection.expectHasProducts();
      await scan('collection');
    });
    await test.step('product page', async () => {
      await pdp.open(products.hero.handle);
      await scan('product page');
    });
    await test.step('cart drawer', async () => {
      await pdp.addToCart();
      await cart.expectOpen();
      await scan('cart drawer');
    });
  });

  test('MKT-02 SMS signup requires TCPA consent', tags('@core', '@P0', '@MKT-02', '@compliance'), async ({ home, newsletter }) => {
    await newsletter.stubSignupEndpoints(); // no real contacts on production lists
    await home.open();

    await test.step('invalid email is rejected', async () => {
      await newsletter.submitEmail('not-an-email');
      await expect(newsletter.invalidEmailError()).toBeVisible();
    });

    await test.step('SMS without consent is blocked', async () => {
      await newsletter.reachSmsStep();
      await newsletter.phone().fill('2125550123');
      await expect(newsletter.consent()).not.toBeChecked();
      await newsletter.phoneSubmit().click();
      await expect(newsletter.consentError()).toBeVisible();
    });

    await test.step('SMS with consent goes through', async () => {
      await newsletter.consent().check({ force: true });
      await newsletter.phoneSubmit().click();
      await expect(newsletter.consentError()).toBeHidden();
    });
  });

  test('MKT-04 ecommerce analytics events carry the right product and price', tags('@core', '@P0', '@MKT-04'), async ({ storefront, pdp, page }) => {
    const v = await storefront.firstAvailableVariant(products.hero.handle, products.hero.sizeOption);
    await pdp.open(products.hero.handle, v.id);

    await test.step('dl_view_item fires once on the product page', async () => {
      await expect.poll(async () => (await dataLayerEvents(page, 'dl_view_item')).length).toBe(1);
    });

    await test.step('dl_add_to_cart fires once with variant, price and quantity', async () => {
      await pdp.chooseOneTime();
      await pdp.addToCart();
      await expect.poll(async () => (await dataLayerEvents(page, 'dl_add_to_cart')).length).toBe(1);
      const [event] = await dataLayerEvents(page, 'dl_add_to_cart');
      const [item] = ecommerceProducts(event);
      expect(String(item.variant_id), 'variant id').toBe(String(v.id));
      expect(Math.round(parseFloat(item.price) * 100), 'price').toBe(v.price);
      expect(String(item.quantity)).toBe('1');
      expect(event.ecommerce.currencyCode).toBe('USD');
    });
  });
});
