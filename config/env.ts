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
  get isProduction() {
    return /^https:\/\/(www\.)?supergoop\.com\/?$/.test(this.baseURL);
  },
};
