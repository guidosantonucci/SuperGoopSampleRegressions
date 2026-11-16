import { expect, type Page } from '@playwright/test';

/** Classic customer account login (staging test account). */
export class AccountPage {
  constructor(private readonly page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto('/account/login');
    await this.page.locator('form[action*="/account/login"] input[type="email"]').first().fill(email);
    await this.page.locator('form[action*="/account/login"] input[type="password"]').first().fill(password);
    await this.page.locator('form[action*="/account/login"] [type="submit"]').first().click();
    await expect(this.page).not.toHaveURL(/\/account\/login/);
  }
}
