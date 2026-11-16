import { expect, type Page } from '@playwright/test';

/** Global header. Locators follow the site's own aria-labels (there are no data-testids). */
export class Header {
  constructor(private readonly page: Page) {}

  readonly logo = () => this.page.getByRole('link', { name: 'Supergoop!' }).first();
  readonly cartButton = () => this.page.getByRole('button', { name: 'Cart', exact: true });
  readonly cartCount = () => this.page.locator('[data-cart-count]').first();
  readonly signIn = () => this.page.getByRole('button', { name: 'Sign in' });
  readonly searchOpener = () => this.page.getByRole('button', { name: 'Open the search window' });
  readonly mobileMenuButton = () => this.page.getByRole('button', { name: 'Open navigation panel' });
  readonly promoBar = () => this.page.locator('[data-promo-bar-slider]').first();

  menuTrigger(name: string) {
    return this.page.getByRole('button', { name: `Open ${name} submenu` });
  }

  isMobile() {
    return (this.page.viewportSize()?.width ?? 1440) < 1024;
  }

  async openMenu(name: string) {
    if (this.isMobile()) await this.mobileMenuButton().click();
    const trigger = this.menuTrigger(name);
    // Desktop mega menu opens on hover; click works on both.
    await trigger.hover().catch(() => {});
    await trigger.click();
  }

  async openCart() {
    await this.cartButton().click();
  }

  async expectCartCount(n: number) {
    await expect(this.cartCount()).toHaveText(String(n));
  }

  async search(term: string) {
    await this.searchOpener().click();
    const input = this.page.locator('#search-field');
    await input.fill(term);
    await input.press('Enter');
  }
}
