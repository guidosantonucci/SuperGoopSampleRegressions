import type { Locator, Page } from '@playwright/test';
import { Header } from './Header';

export abstract class BasePage {
  readonly header: Header;

  constructor(readonly page: Page) {
    this.header = new Header(page);
  }

  async goto(path: string) {
    const res = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.dismissOverlays();
    return res;
  }

  /** OneTrust cookie banner / promo modals that can intercept clicks. Best-effort, never fails. */
  async dismissOverlays() {
    const candidates: Locator[] = [
      this.page.locator('#onetrust-accept-btn-handler'),
      this.page.getByRole('button', { name: /^(close|dismiss)( dialog| popup)?$/i }).filter({ visible: true }),
    ];
    for (const c of candidates) {
      if (await c.first().isVisible().catch(() => false)) await c.first().click().catch(() => {});
    }
  }
}
