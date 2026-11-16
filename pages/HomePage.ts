import type { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  readonly main = () => this.page.locator('#MainContent');
  readonly heroCta = () => this.main().getByRole('link', { name: /shop/i }).first();
  readonly newsletterEmail = () => this.page.getByRole('textbox', { name: /email/i }).last();

  async open() {
    return this.goto('/');
  }
}
