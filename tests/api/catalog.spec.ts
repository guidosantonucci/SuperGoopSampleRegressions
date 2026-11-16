import { test, expect } from '@playwright/test';
import { criticalPages, nonSellableTypes, products } from '../../data/catalog';

/** Fast, browserless checks of catalog health. Runs in seconds; good PR gate. */
test.describe('Catalog & site health @smoke @api', () => {
  test('products.json: every sellable product has a positive-priced variant', async ({ request }) => {
    const res = await request.get('/products.json?limit=250');
    expect(res.status()).toBe(200);
    const { products: all } = await res.json();
    expect(all.length).toBeGreaterThan(20);

    const problems: string[] = [];
    for (const p of all) {
      if (nonSellableTypes.includes(p.product_type) || /gift-card|giftcard/.test(p.handle)) continue;
      if (!p.variants.length) problems.push(`${p.handle}: no variants`);
      for (const v of p.variants) {
        if (Number(v.price) <= 0) problems.push(`${p.handle} / ${v.title}: price ${v.price}`);
        if (v.compare_at_price && Number(v.compare_at_price) < Number(v.price))
          problems.push(`${p.handle} / ${v.title}: compare-at ${v.compare_at_price} < price ${v.price}`);
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('hero product is published and in stock', async ({ request }) => {
    const p = await (await request.get(`/products/${products.hero.handle}.js`)).json();
    expect(p.available).toBe(true);
  });

  for (const path of criticalPages) {
    test(`page ${path} resolves`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
    });
  }

  test('robots.txt and sitemap are served', async ({ request }) => {
    expect((await request.get('/robots.txt')).status()).toBe(200);
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('<sitemapindex');
  });
});
