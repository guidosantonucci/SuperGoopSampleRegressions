/**
 * Test data anchored on HANDLES, not variant IDs or prices.
 * Variant IDs and prices are resolved at runtime from /products/<handle>.js,
 * so merchandising changes (and the live pricing A/B test) don't break the suite.
 */
export const products = {
  /** Hero SKU: 4 sizes, Skio subscription, always in the bestsellers menu. */
  hero: { handle: 'unseen-sunscreen-spf-50', title: 'Unseen Sunscreen SPF 50', sizeOption: '1.7 fl. oz.' },
  /** Multi-option product (scent) with a wide price range. */
  multiVariant: { handle: 'antioxidant-infused-sunscreen-mist-with-vitamin-c' },
  /** Cheap item, useful to stay BELOW the free-gift threshold. */
  lowPrice: { handle: 'play-everyday-face-lotion-spf-50' },
  /** Kit / set merchandised on Super Steals. */
  set: { handle: 'bestsellers-sunscreen-set' },
  /** Gift card (Rise.ai). */
  giftCard: { handle: 'rise-ai-giftcard' },
};

export const collections = {
  all: '/collections/all',
  bestsellers: '/collections/best-sellers-spf',
  superSteals: '/collections/supersteals',
  body: '/collections/body',
  mineral: '/collections/mineral-spf',
  gifts: '/collections/sunscreen-gifts-kits',
};

/** Top-level navigation as seen in the header (aria-label "Open <name> submenu"). */
export const navMenus = ['Shop All', 'Bestsellers', 'Shop By Type', 'Discover'];

/**
 * Promotions. These change with campaigns (BFCM etc.), so keep them in ONE place.
 * Free gift is added by the "Kite" promo app as a $0 line with property _free_product=true.
 */
export const promos = {
  freeGift: {
    thresholdUsd: 70,
    giftHandle: 'every-single-face-watery-lotion-spf-50-gift',
    lineProperty: '_free_product',
  },
  subscription: { appId: 'SKIO', discountPct: 10 },
  freeShippingThresholdUsd: 50,
};

/** Product types that must never be sold directly (gifts/samples). */
export const nonSellableTypes = ['Free Samples'];

/** Pages that must always resolve (legal, support, revenue programs). */
export const criticalPages = [
  '/pages/faq-help',
  '/pages/rewards',
  '/pages/supermail',
  '/pages/privacy-policy',
  '/pages/terms-conditions',
  '/pages/fsa-hsa',
  '/pages/bulk-gifting',
  '/pages/store-locator',
];
