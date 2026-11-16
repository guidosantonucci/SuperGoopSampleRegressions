import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  readonly title = () => this.page.getByRole('heading', { level: 1 }).first();
  /** Main buy box button (the sticky bar and quick-add tiles use other attributes). */
  readonly addToBag = () => this.page.locator('button[data-add-to-cart]').first();
  readonly planPicker = () => this.page.locator('skio-plan-picker').first();
  readonly oneTime = () => this.planPicker().getByText('One-Time Purchase');
  readonly subscribe = () => this.planPicker().getByText(/Subscribe & Save/);
  readonly reviewsLink = () => this.page.getByRole('link', { name: /\d[\d,]* Reviews/ }).first();
  /** Accordion that holds Drug Facts (Active / Inactive Ingredients). */
  readonly ingredientsAccordion = () => this.page.locator('details').filter({ has: this.page.locator('summary', { hasText: /^\s*ingredients\s*$/i }) }).first();

  /**
   * Option inputs come in two shapes:
   *  - regular products: name="<option>-variant" (size-variant, color-variant, scent-variant)
   *  - bundles: name="<Component product> (<Option>)"
   */
  optionInput(option: string, value: string) {
    const regular = this.page.locator(`input[type="radio"][name="${option.toLowerCase()}-variant"][value="${value}"]`);
    const bundle = this.page.locator(`input[type="radio"][name="${option}"][value="${value}"]`);
    return regular.or(bundle).first();
  }

  /** Back-compat helper for size. */
  sizeInput(size: string) {
    return this.optionInput('Size', size);
  }

  async open(handle: string, variantId?: number) {
    return this.goto(`/products/${handle}${variantId ? `?variant=${variantId}` : ''}`);
  }

  async selectOption(option: string, value: string) {
    const input = this.optionInput(option, value);
    // Inputs are visually hidden behind styled swatches/labels.
    await input.check({ force: true });
    await expect(input).toBeChecked();
  }

  async selectSize(size: string) {
    await this.selectOption('Size', size);
  }

  async chooseSubscription() {
    await this.subscribe().click();
  }

  async chooseOneTime() {
    await this.oneTime().click();
  }

  /** Price as shown on the Add to bag button, e.g. "Add to bag $38" -> 3800 (cents). */
  async buttonPriceCents(): Promise<number> {
    await expect(this.addToBag()).toContainText('$');
    const text = (await this.addToBag().innerText()).replace(/\s+/g, ' ');
    const m = text.match(/\$([\d,]+(?:\.\d{2})?)/);
    if (!m) throw new Error(`No price on Add to bag button: "${text}"`);
    return Math.round(parseFloat(m[1].replace(/,/g, '')) * 100);
  }

  async addToCart() {
    const added = this.page.waitForResponse((r) => r.url().includes('/cart/add') && r.request().method() === 'POST');
    await this.addToBag().click();
    const res = await added;
    expect(res.status(), 'cart/add response').toBe(200);
  }

  /** Opens the Ingredients accordion and returns the Active Ingredients line. */
  async activeIngredients(): Promise<string> {
    const acc = this.ingredientsAccordion();
    await acc.evaluate((d: HTMLDetailsElement) => (d.open = true));
    const text = await acc.innerText();
    const m = text.match(/Active Ingredients?\s*\n+\s*([^\n]+)/i);
    return m ? m[1].trim() : '';
  }

  /** schema.org Product offers from JSON-LD. */
  async jsonLdOffers(): Promise<{ price: string; availability: string; url: string }[]> {
    return this.page.evaluate(() => {
      const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
        try {
          return JSON.parse(s.textContent || 'null');
        } catch {
          return null;
        }
      });
      const all = blocks.flat().filter(Boolean);
      const product = all.find((b: any) => b['@type'] === 'Product');
      return product ? [].concat(product.offers ?? []) : [];
    });
  }
}
