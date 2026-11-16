import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

/** Collection grids are rendered client-side by Searchspring (ss__ classes). */
export class CollectionPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  readonly productLinks = () => this.page.locator('#MainContent a[href*="/products/"]');
  readonly filter = (label: string | RegExp) => this.page.getByRole('checkbox', { name: label });

  async open(path: string) {
    return this.goto(path);
  }

  async expectHasProducts(min = 1) {
    await expect(this.productLinks().first()).toBeVisible({ timeout: 20_000 });
    expect(await this.productLinks().count()).toBeGreaterThanOrEqual(min);
  }

  async productHandles(): Promise<string[]> {
    const hrefs = await this.productLinks().evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).pathname));
    return [...new Set(hrefs.map((h) => h.split('/products/')[1]?.split(/[/?#]/)[0]).filter(Boolean))] as string[];
  }
}
