import { expect, type Page } from '@playwright/test';
import { Storefront } from './storefront';
import { promos, products } from '../data/catalog';
import type { CheckoutPage, Address } from '../pages/CheckoutPage';

/** Tags for test details: test('...', tags('@core', '@P0', '@PDP-03'), async () => {}) */
export const tags = (...t: string[]) => ({ tag: t });

export const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The free-gift app (Kite) evaluates the cart client-side after a page load / cart change.
 * Load a page, then poll the cart until the gift state settles.
 */
export async function expectGift(page: Page, storefront: Storefront, present: boolean, timeout = 20_000) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect
    .poll(async () => Storefront.giftLines(await storefront.cart()).some((l) => l.handle === promos.freeGift.giftHandle), {
      timeout,
      message: `free gift should be ${present ? 'present' : 'absent'}`,
    })
    .toBe(present);
}

/**
 * Absence checks pass instantly, so give the promo app a fair chance to (wrongly) add the gift first.
 * Load a page, let the network settle, then assert the gift is NOT there.
 */
export async function expectNoGiftAfterSettle(page: Page, storefront: Storefront) {
  await page.goto('/', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(5_000); // promo app debounce; no observable "done" signal to wait on
  const gifts = Storefront.giftLines(await storefront.cart());
  expect(gifts.map((g) => g.handle), 'no free gift expected').toEqual([]);
}

/** Seeds a cart at or above the free-gift threshold with the hero product. */
export async function seedCartAboveGiftThreshold(storefront: Storefront) {
  const v = await storefront.firstAvailableVariant(products.hero.handle, products.hero.sizeOption);
  const qty = Math.ceil((promos.freeGift.thresholdUsd * 100) / v.price);
  await storefront.add(v.id, qty);
  return { variant: v, qty };
}

/** Staging: seed a cart, fill shipping and pay with the Bogus Gateway. Returns the email used. */
export async function placeBogusOrder(
  page: Page,
  storefront: Storefront,
  checkout: CheckoutPage,
  address: Address,
  card: '1' | '2' | '3' = '1',
) {
  const v = await storefront.firstAvailableVariant(products.hero.handle, products.hero.sizeOption);
  await storefront.add(v.id, 1);
  await page.goto('/checkout');
  await checkout.expectLoaded();
  await checkout.fillShipping(address);
  await checkout.waitForShippingRates();
  await checkout.payWithBogusGateway(card);
  return { variant: v };
}
