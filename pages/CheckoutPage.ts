import { expect, type Locator, type Page } from '@playwright/test';
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

const PAYMENT_RADIOS = /credit card|shop pay|paypal|billing|same as shipping|different billing|venmo|afterpay|klarna/i;

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
  readonly address1 = () =>
    this.page.getByRole('combobox', { name: 'Address' }).or(this.page.getByRole('textbox', { name: 'Address' })).first();
  readonly city = () => this.page.getByRole('textbox', { name: 'City' });
  readonly state = () => this.page.getByRole('combobox', { name: 'State' });
  readonly zip = () => this.page.getByRole('textbox', { name: /ZIP/ });
  readonly discountInput = () => this.page.getByRole('textbox', { name: /discount code or gift card/i }).first();
  readonly applyDiscount = () => this.page.getByRole('button', { name: /^apply/i }).first();
  readonly payNow = () => this.page.getByRole('button', { name: /pay now|complete order/i });
  readonly paymentHeading = () => this.page.getByRole('heading', { name: 'Payment' });
  readonly shippingHeading = () => this.page.getByRole('heading', { name: /shipping method/i });
  readonly shippingPlaceholder = () => this.page.getByText(/enter your shipping address to view/i);

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
    await this.zip().blur();
  }

  /** Waits until shipping rates have been calculated for the entered address. */
  async waitForShippingRates() {
    await expect(this.shippingPlaceholder()).toBeHidden({ timeout: 30_000 });
    await expect(this.shippingOptions().first()).toBeVisible({ timeout: 30_000 });
  }

  /** Shipping method radios (payment-method radios filtered out). */
  shippingOptions(): Locator {
    return this.page.getByRole('radio').filter({ hasNotText: PAYMENT_RADIOS }).filter({ hasText: /\$|free/i });
  }

  async shippingOptionTexts(): Promise<string[]> {
    const labels = await this.page
      .locator('label')
      .filter({ has: this.page.locator('input[type="radio"]') })
      .filter({ hasNotText: PAYMENT_RADIOS })
      .allInnerTexts();
    return labels.map((t) => t.replace(/\s+/g, ' ').trim()).filter((t) => /\$|free/i.test(t));
  }

  /**
   * Reads an amount from the order summary by its label, e.g. /^Subtotal/, /^Shipping$/, /taxes/i, /^Total$/.
   * Returns cents; "Free" = 0; null when the row isn't there (e.g. tax not calculated yet).
   */
  async summaryAmount(label: RegExp): Promise<number | null> {
    const row = this.page
      .locator('div, tr')
      .filter({ has: this.page.getByText(label) })
      .filter({ hasText: /\$|free/i })
      .last();
    if (!(await row.count())) return null;
    const text = (await row.innerText()).replace(/\s+/g, ' ');
    if (/\bfree\b/i.test(text) && !/\$\d/.test(text)) return 0;
    const all = [...text.matchAll(/\$([\d,]+\.\d{2})/g)];
    if (!all.length) return null;
    return Math.round(parseFloat(all[all.length - 1][1].replace(/,/g, '')) * 100);
  }

  async summary() {
    return {
      subtotal: await this.summaryAmount(/^Subtotal/),
      shipping: await this.summaryAmount(/^Shipping$/),
      tax: await this.summaryAmount(/tax/i),
      total: await this.summaryAmount(/^Total$/),
      savings: await this.summaryAmount(/total savings/i),
    };
  }

  async applyCode(code: string) {
    await this.discountInput().fill(code);
    await this.applyDiscount().click();
  }

  /** Submits with empty/invalid fields: safe on production, Shopify validates client-side. */
  async submitExpectingValidation() {
    await this.payNow().click();
  }

  private assertCanPlaceOrders() {
    if (!env.allowOrderPlacement || env.isProduction) {
      throw new Error('Order placement is disabled for this environment (production or ALLOW_ORDER_PLACEMENT=false).');
    }
  }

  /** Bogus Gateway only (staging). Card "1" = success, "2" = decline, "3" = gateway error. */
  async payWithBogusGateway(card: '1' | '2' | '3' = '1') {
    this.assertCanPlaceOrders();
    const field = (title: string) => this.page.frameLocator(`iframe[title*="${title}"]`).getByRole('textbox');
    await this.page.getByRole('radio', { name: /credit card/i }).check().catch(() => {});
    await field('Card number').fill(card);
    await field('Expiration date').fill('12 / 30');
    await field('Security code').fill('123');
    await field('Name on card').fill('QA Automation');
    await this.payNow().click();
  }

  /** PayPal sandbox (staging). Redirect/popup flow, then back to Shopify. */
  async payWithPayPalSandbox(email: string, password: string) {
    this.assertCanPlaceOrders();
    await this.page.getByRole('radio', { name: /paypal/i }).check();
    const popupPromise = this.page.waitForEvent('popup', { timeout: 15_000 }).catch(() => null);
    await this.payNow().click();
    const pp = (await popupPromise) ?? this.page;
    await pp.waitForURL(/paypal\.com/, { timeout: 30_000 });
    await pp.getByRole('textbox', { name: /email/i }).fill(email);
    await pp.getByRole('button', { name: /next/i }).click().catch(() => {});
    await pp.getByRole('textbox', { name: /password/i }).fill(password);
    await pp.getByRole('button', { name: /log in/i }).click();
    await pp.getByRole('button', { name: /complete purchase|pay now|continue/i }).first().click();
  }

  readonly thankYou = () => this.page.getByText(/thank you/i).first();
  readonly orderNumber = () => this.page.getByText(/order #?\s*[A-Z]*\d+/i).first();
  readonly paymentError = () =>
    this.page.getByText(/declined|couldn.t be processed|there was an issue processing|payment.*(failed|error)/i).first();
}
