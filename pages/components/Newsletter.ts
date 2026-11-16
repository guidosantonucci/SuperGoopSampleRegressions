import { expect, type Page } from '@playwright/test';

/**
 * Footer signup: email first (#newsletter_form), then the SMS step (#phoneForm)
 * appears with a required TCPA consent checkbox (#newsletter-agreement).
 */
export class Newsletter {
  constructor(private readonly page: Page) {}

  readonly emailForm = () => this.page.locator('#newsletter_form');
  readonly email = () => this.emailForm().locator('input[type="email"]');
  readonly emailSubmit = () => this.emailForm().getByRole('button', { name: /submit/i });

  readonly phoneForm = () => this.page.locator('#phoneForm');
  readonly phone = () => this.phoneForm().locator('input[type="tel"]');
  readonly consent = () => this.page.locator('#newsletter-agreement');
  readonly phoneSubmit = () => this.phoneForm().getByRole('button', { name: /submit/i });

  readonly consentError = () => this.page.getByText("Please select the 'Terms and Conditions' checkbox to continue");
  readonly invalidEmailError = () => this.page.getByText('Please input a valid email address.');

  /**
   * Fakes the signup endpoints so production lists never receive test contacts.
   * Client-side validation still runs for real.
   */
  async stubSignupEndpoints() {
    await this.page.route(/\/contact\?form_type=customer/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await this.page.route(/attn\.tv|attentivemobile/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  }

  async submitEmail(email: string) {
    await this.email().scrollIntoViewIfNeeded();
    await this.email().fill(email);
    await this.emailSubmit().click();
  }

  async reachSmsStep(email = 'qa+automation@example.com') {
    await this.submitEmail(email);
    await expect(this.phoneForm()).toBeVisible();
  }
}
