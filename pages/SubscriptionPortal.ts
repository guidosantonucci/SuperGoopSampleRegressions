import { expect, type Page } from '@playwright/test';
import { env } from '../config/env';

/**
 * Skio customer portal (staging, logged-in customer with an active subscription).
 * Locators are role/text based on Skio's standard portal labels: confirm them
 * against the staging portal on first run.
 */
export class SubscriptionPortal {
  constructor(private readonly page: Page) {}

  readonly subscriptionCard = () => this.page.getByRole('article').or(this.page.locator('[class*="subscription"]')).first();
  readonly nextOrderDate = () => this.page.getByText(/next order|next shipment/i).first();
  readonly skipButton = () => this.page.getByRole('button', { name: /skip/i }).first();
  readonly frequencyButton = () => this.page.getByRole('button', { name: /frequency|deliver every|change schedule/i }).first();
  readonly swapButton = () => this.page.getByRole('button', { name: /swap|change product/i }).first();
  readonly cancelButton = () => this.page.getByRole('button', { name: /cancel subscription|cancel/i }).last();
  readonly confirmButton = () => this.page.getByRole('button', { name: /confirm|yes|save|update/i }).last();

  async open() {
    await this.page.goto(env.subscriptionPortalPath);
    await expect(this.subscriptionCard()).toBeVisible({ timeout: 30_000 });
  }

  async nextOrderText() {
    return (await this.nextOrderDate().locator('xpath=..').innerText()).replace(/\s+/g, ' ');
  }
}
