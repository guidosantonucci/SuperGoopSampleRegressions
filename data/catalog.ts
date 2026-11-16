/**
 * Test data anchored on HANDLES, not variant IDs or prices.
 * Variant IDs and prices are resolved at runtime from /products/<handle>.js,
 * so merchandising changes (and the live pricing A/B test) don't break the suite.
 */
export const products = {
  /** Hero SKU: 4 sizes, Skio subscription, always in the bestsellers menu. */
  hero: { handle: 'unseen-sunscreen-spf-50', title: 'Unseen Sunscreen SPF 50', sizeOption: '1.7 fl. oz.' },
  /** Shade product: Color (color-variant) x Size. */
  shade: { handle: 'smooth-and-poreless-mattescreen', option: 'Color', value: 'Golden Hour' },
  /** Scent product: Scent (scent-variant) x Size. */
  scent: { handle: 'antioxidant-infused-sunscreen-mist-with-vitamin-c', option: 'Scent', value: 'Vanilla Orchid' },
  /** Cheap item, useful to stay BELOW thresholds. */
  lowPrice: { handle: 'play-everyday-face-lotion-spf-50' },
  /** $32: hero 1.7 oz ($38) + this = exactly $70. */
  thirtyTwo: { handle: 'unseen-clear-sunscreen-stick' },
  /** Customizable bundle: one radio group per component product, bundle-level discount. */
  bundle: {
    handle: 'the-matte-prime-reapply-set',
    choices: [
      { option: 'Mineral Mattescreen SPF 40 (Color)', value: 'Golden Hour' },
      { option: '(Re)setting 100% Mineral Powder SPF 35 (Color)', value: 'Deep' },
    ],
  },
  /**
   * Super Steals set. Markdowns are NOT compare-at prices: an automatic discount
   * ("SPF Set SUPERSTEAL") takes $134 down to $99.16 in the cart.
   */
  set: { handle: 'bestsellers-sunscreen-set', discountTitle: /SUPERSTEAL/i },
  /** Gift card (Rise.ai). */
  giftCard: { handle: 'rise-ai-giftcard' },
};

/** The 6 products in the Bestsellers mega menu. */
export const bestsellers = [
  'unseen-sunscreen-spf-50',
  'glowscreen-spf-40',
  'everyday-sunscreen',
  'antioxidant-infused-sunscreen-mist-with-vitamin-c',
  'smooth-and-poreless-mattescreen',
  'protectint-skin-tint-spf-50',
];

/**
 * Approved Drug Facts copy (active ingredients). Source of truth = regulatory/label team.
 * Products not listed here are checked for presence + format only.
 */
export const activeIngredients: Record<string, string> = {
  'unseen-sunscreen-spf-50': 'Avobenzone 3%, Homosalate 7%, Octisalate 5%, Octocrylene 9%',
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
    /** OPEN QUESTION: does the threshold count before or after discounts? */
    thresholdIsPreDiscount: true,
  },
  subscription: { appId: 'SKIO', discountPct: 10, defaultFrequency: /every 3 months/i },
  /**
   * OPEN QUESTION: product page says "free shipping on $50+", promo bar says "free shipping on all orders".
   * Set to the rule that is live; PROMO-13 asserts against it.
   */
  shipping: { freeOnAllOrders: true, freeThresholdUsd: 50 },
  /** OPEN QUESTION: can codes stack with product discounts (e.g. the free gift)? */
  codesCombineWithProductDiscounts: false,
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

/**
 * Third-party apps that shape the shopping experience. PLAT-02 blocks each one
 * and checks the shopper can still buy.
 */
export const shopperApps: Record<string, string[]> = {
  Searchspring: ['searchspring.io', 'searchspring.net'],
  Rebuy: ['rebuyengine.com'],
  Yotpo: ['yotpo.com'],
  Skio: ['skio.com'],
  'Kite / cart-bot': ['cart-bot.net'],
  Gorgias: ['gorgias.chat', 'gorgias.help'],
};

/** Marketing pixels that must stay silent once a shopper opts out (CMP-01). */
export const marketingPixelHosts = [
  'connect.facebook.net',
  'facebook.com/tr',
  'analytics.tiktok.com',
  'ct.pinterest.com',
  'tr.snapchat.com',
  'criteo.com',
  'bat.bing.com',
  'googleads.g.doubleclick.net',
];
