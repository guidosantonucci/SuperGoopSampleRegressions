import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  readonly title = () => this.page.getByRole('heading', { level: 1 }).first();
  /** Main buy box button (the sticky bar and quick-add tiles use other attributes). */
  readonly addToBag = () => this.page.locator('button[data-add-to-cart]').first();
  readonly sizeInput = (size: string) => this.page.locator(`input[name="size-variant"][value="${size}"]`);
  readonly planPicker = () => this.page.locator('skio-plan-picker').first();
  readonly oneTime = () => this.planPicker().getByText('One-Time Purchase');
  readonly subscribe = () => this.planPicker().getByText(/Subscribe & Save/);
  readonly reviewsLink = () => this.page.getByRole('link', { name: /\d[\d,]* Reviews/ }).first();
  readonly quantity = () => this.page.locator('input[name="quantity"]').first();

  async open(handle: string, variantId?: number) {
    return this.goto(`/products/${handle}${variantId ? `?variant=${variantId}` : ''}`);
  }

  async selectSize(size: string) {
    // Inputs are visually hidden behind styled labels.
    await this.sizeInput(size).check({ force: true });
    await expect(this.sizeInput(size)).toBeChecked();
  }

  async chooseSubscription() {
    await this.subscribe().click();
  }

  async chooseOneTime() {
    await this.oneTime().click();
  }

  /** Price as shown on the Add to bag button, e.g. "Add to bag $38" -> 3800 (cents). */
  async buttonPriceCents(): Promise<number> {
    const text = (await this.addToBag().innerText()).replace(/\s+/g, ' ');
    const m = text.match(/\$(\d+(?:\.\d{2})?)/);
    if (!m) throw new Error(`No price on Add to bag button: "${text}"`);
    return Math.round(parseFloat(m[1]) * 100);
  }

  async addToCart() {
    const added = this.page.waitForResponse((r) => r.url().includes('/cart/add') && r.request().method() === 'POST');
    await this.addToBag().click();
    const res = await added;
    expect(res.status(), 'cart/add response').toBe(200);
  }
}
