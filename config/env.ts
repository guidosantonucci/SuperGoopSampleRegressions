import 'dotenv/config';

const bool = (v: string | undefined, fallback = false) =>
  v === undefined || v === '' ? fallback : ['1', 'true', 'yes'].includes(v.toLowerCase());

export const env = {
  baseURL: process.env.BASE_URL ?? 'https://supergoop.com',
  /** Guard rail: only a staging store with the Bogus Gateway may place orders. */
  allowOrderPlacement: bool(process.env.ALLOW_ORDER_PLACEMENT),
  storefrontPassword: process.env.STOREFRONT_PASSWORD ?? '',
  blockTrackers: bool(process.env.BLOCK_TRACKERS, true),
  user: {
    email: process.env.TEST_USER_EMAIL ?? '',
    password: process.env.TEST_USER_PASSWORD ?? '',
  },
  /** Shopify Admin GraphQL (staging custom app). */
  admin: {
    storeDomain: process.env.SHOPIFY_STORE_DOMAIN ?? '', // e.g. supergoop-staging.myshopify.com
    token: process.env.SHOPIFY_ADMIN_TOKEN ?? '',
    apiVersion: process.env.SHOPIFY_API_VERSION ?? '2025-01',
  },
  /** Mailosaur inbox for transactional email checks. */
  mailosaur: {
    apiKey: process.env.MAILOSAUR_API_KEY ?? '',
    serverId: process.env.MAILOSAUR_SERVER_ID ?? '',
  },
  paypal: {
    email: process.env.PAYPAL_SANDBOX_EMAIL ?? '',
    password: process.env.PAYPAL_SANDBOX_PASSWORD ?? '',
  },
  /** Path of the Skio customer portal on the storefront. */
  subscriptionPortalPath: process.env.SUBSCRIPTION_PORTAL_PATH ?? '/a/account',

  get isProduction() {
    return /^https:\/\/(www\.)?supergoop\.com\/?$/.test(this.baseURL);
  },
  /** Staging = not production AND order placement explicitly allowed. */
  get isStaging() {
    return !this.isProduction && this.allowOrderPlacement;
  },
  get hasAdminApi() {
    return !!(this.admin.storeDomain && this.admin.token);
  },
  get hasInbox() {
    return !!(this.mailosaur.apiKey && this.mailosaur.serverId);
  },
};

/** Standard skip reasons so reports read consistently. */
export const SKIP = {
  staging: 'Staging only: set BASE_URL to a staging store and ALLOW_ORDER_PLACEMENT=true',
  admin: 'Needs Shopify Admin API (SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_TOKEN)',
  inbox: 'Needs a Mailosaur inbox (MAILOSAUR_API_KEY, MAILOSAUR_SERVER_ID)',
  paypal: 'Needs PayPal sandbox buyer (PAYPAL_SANDBOX_EMAIL, PAYPAL_SANDBOX_PASSWORD)',
  account: 'Needs a seeded test account (TEST_USER_EMAIL, TEST_USER_PASSWORD)',
};
