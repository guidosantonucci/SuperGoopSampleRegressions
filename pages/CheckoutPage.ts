import { expect, type Page } from '@playwright/test';
import { env } from '../config/env';

export interface Address {
  email: string;
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  state: string; // e.g. "New York"
  zip: string;
}

export const TEST_ADDRESS: Address = {
  email: 'qa+automation@example.com',
  firstName: 'QA',
  lastName: 'Automation',
  address1: '350 5th Ave',
  city: 'New York',
  state: 'New York',
  zip: '10118',
};

/**
 * Shopify-hosted checkout (one-page). Shared across every Shopify client.
 * Order placement is hard-guarded: it only runs when ALLOW_ORDER_PLACEMENT=true
 * AND the target is not production.
 */
export class CheckoutPage {
  constructor(private readonly page: Page) {}

  readonly email = () => this.page.getByRole('textbox', { name: /^email/i });
  readonly firstName = () => this.page.getByRole('textbox', { name: 'First name' });
  readonly lastName = () => this.page.getByRole('textbox', { name: 'Last name' });
  readonly address1 = () => this.page.getByRole('combobox', { name: 'Address' }).or(this.page.getByRole('textbox', { name: 'Address' }));
  readonly city = () => this.page.getByRole('textbox', { name: 'City' });
  readonly state = () => this.page.getByRole('combobox', { name: 'State' });
  readonly zip = () => this.page.getByRole('textbox', { name: /ZIP/ });
  readonly discountInput = () => this.page.getByRole('textbox', { name: /discount code or gift card/i }).first();
  readonly applyDiscount = () => this.page.getByRole('button', { name: /^apply/i }).first();
  readonly payNow = () => this.page.getByRole('button', { name: /pay now/i });
  readonly total = () => this.page.getByText(/^Total$/).locator('xpath=..');
  readonly paymentHeading = () => this.page.getByRole('heading', { name: 'Payment' });

  async expectLoaded() {
    await expect(this.page).toHaveURL(/\/checkouts?\//);
    await expect(this.paymentHeading()).toBeVisible({ timeout: 30_000 });
  }

  async expectLineItem(name: string | RegExp) {
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  async fillShipping(a: Address = TEST_ADDRESS) {
    await this.email().fill(a.email);
    await this.firstName().fill(a.firstName);
    await this.lastName().fill(a.lastName);
    await this.address1().fill(a.address1);
    await this.page.keyboard.press('Escape'); // close address autocomplete
    await this.city().fill(a.city);
    await this.state().selectOption({ label: a.state });
    await this.zip().fill(a.zip);
  }

  async applyCode(code: string) {
    await this.discountInput().fill(code);
    await this.applyDiscount().click();
  }

  /** Submits with empty/invalid fields: safe on production, Shopify validates client-side. */
  async submitExpectingValidation() {
    await this.payNow().click();
  }

  /** Bogus Gateway only (staging). Card "1" = success, "2" = decline, "3" = gateway error. */
  async payWithBogusGateway(card: '1' | '2' | '3' = '1') {
    if (!env.allowOrderPlacement || env.isProduction) {
      throw new Error('Order placement is disabled for this environment (production or ALLOW_ORDER_PLACEMENT=false).');
    }
    const frame = (title: RegExp) => this.page.frameLocator(`iframe[title*="${title.source}"]`);
    await frame(/Card number/).getByRole('textbox').fill(card);
    await frame(/Expiration date/).getByRole('textbox').fill('12 / 30');
    await frame(/Security code/).getByRole('textbox').fill('123');
    await frame(/Name on card/).getByRole('textbox').fill('QA Automation');
    await this.payNow().click();
  }
}
