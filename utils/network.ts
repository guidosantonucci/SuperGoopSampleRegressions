import type { Page } from '@playwright/test';

/**
 * Pure marketing/analytics hosts seen on supergoop.com. Blocking them makes tests faster
 * and removes a big source of flakiness WITHOUT touching anything that affects the
 * shopping experience.
 *
 * NOT blocked on purpose (they change what the shopper sees):
 *  Rebuy (cart upsells), Skio (subscriptions), Searchspring (search + collection grids),
 *  Yotpo (reviews + loyalty), Rise.ai (gift cards), Gorgias (chat), Kite/cart-bot (free gift),
 *  OneTrust (cookie consent), Riskified (fraud), back-in-stock widget.
 */
export const TRACKER_HOSTS = [
  'clarity.ms',
  'bat.bing.com',
  'ct.pinterest.com',
  's.pinimg.com',
  'analytics.tiktok.com',
  'tr.snapchat.com',
  'sc-static.net',
  'connect.facebook.net',
  'googletagmanager.com',
  'googleads.g.doubleclick.net',
  'google-analytics.com',
  'amazon-adsystem.com',
  'cdn.pdst.fm',
  'heap-api.com',
  'rmp.rakuten.com',
  'rakutenadvertising.io',
  'clinch.co',
  'criteo.com',
  'lexer.io',
  'adsrvr.org',
  'shopmy.us',
  '9gtb.com',
  'noibu.com',
  'spiffy.ai',
  'attn.tv', // Attentive SMS popup: blocked by default, covered by its own @marketing test
];

export async function blockTrackers(page: Page, allow: string[] = []) {
  const hosts = TRACKER_HOSTS.filter((h) => !allow.includes(h));
  await page.route(
    (url) => hosts.some((h) => url.hostname.endsWith(h)),
    (route) => route.abort('blockedbyclient'),
  );
}

/** Console errors we know are third-party noise and should not fail a test. */
export const IGNORED_CONSOLE_ERRORS: RegExp[] = [
  /ERR_BLOCKED_BY_CLIENT/i,
  /Failed to load resource/i,
  /blockedbyclient/i,
  /Content Security Policy/i,
];
