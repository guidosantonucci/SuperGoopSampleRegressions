# SuperGoopSampleRegressions

Playwright + TypeScript tests for supergoop.com (Shopify).

```bash
npm install
npx playwright install
cp .env.example .env
npm run test:api      # browserless catalog/site checks (seconds)
npm run test:smoke    # critical purchase path
npm run test:core     # cart, promos, subscriptions, checkout, discovery
```

- Production is read-only: no test presses "Pay now" with real data. Full orders run only with
  `ALLOW_ORDER_PLACEMENT=true` against a staging store using Shopify's Bogus Gateway (`@staging`).
- Carts are seeded through `/cart/*.js` (`utils/storefront.ts`) and verified in the UI.
- Marketing pixels are blocked by default (`utils/network.ts`); shopper-facing apps are not.
- Tags: `@smoke` (PR gate), `@core` (main), `@promo`, `@subscription`, `@checkout`, `@quarantine` (skipped).
