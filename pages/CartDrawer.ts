import { expect, type Page } from '@playwright/test';

/** Slide-out "My Bag" drawer (theme section + Rebuy upsells). */
export class CartDrawer {
  constructor(private readonly page: Page) {}

  readonly root = () => this.page.locator('#shopify-section-cart');
  readonly heading = () => this.root().getByText(/My Bag \(\d+\)/);
  readonly removeButtons = () => this.root().getByRole('button', { name: /^Remove / });
  readonly increase = (i = 0) => this.root().getByRole('button', { name: 'Increase quantity' }).nth(i);
  readonly decrease = (i = 0) => this.root().getByRole('button', { name: 'Decrease quantity' }).nth(i);
  readonly checkout = () => this.root().getByRole('link', { name: /check ?out/i });
  readonly close = () => this.root().getByRole('button', { name: 'Close' });
  readonly upsellButtons = () => this.root().getByRole('button', { name: /add to bag - \$/i });
  readonly freeGiftUnlocked = () => this.root().getByText(/free gift unlocked/i);
  readonly subtotal = () => this.root().getByText(/subtotal/i).locator('xpath=..');

  async expectOpen(count?: number) {
    await expect(this.heading()).toBeVisible();
    if (count !== undefined) await expect(this.heading()).toHaveText(`My Bag (${count})`);
  }

  async subtotalCents(): Promise<number> {
    const text = await this.subtotal().innerText();
    const m = text.match(/\$([\d,]+\.\d{2})/);
    if (!m) throw new Error(`No subtotal in "${text}"`);
    return Math.round(parseFloat(m[1].replace(/,/g, '')) * 100);
  }

  async goToCheckout() {
    await this.checkout().click();
    await this.page.waitForURL(/\/checkouts?\//, { timeout: 30_000 });
  }
}
