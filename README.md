# SuperGoopSampleRegressions

Playwright + TypeScript regression framework for supergoop.com (Shopify), built around a
risk-based **Core 38**: the test cases that protect revenue, pricing, checkout and compliance.

## Quick start

```bash
npm install
npx playwright install
cp .env.example .env
npm run test:api        # browserless catalog checks (seconds)
npm run test:smoke      # PR gate
npm run test:core       # Core 38
```

## Suites and tags

| Script | Runs | When |
|---|---|---|
| `test:smoke` | `@smoke`: purchase path, cart, search, collections, catalog | Every pull request |
| `test:core` | `@core`: the Core 38 | Every push to `main` |
| `test:core:p0` | `@core` + `@P0` | Pre-release |
| `test:regression` | `@regression`: P1/P2 cases | Nightly |
| `test:staging` | `@staging`: order placement, Admin API, sandboxes | Against staging |

Every test is tagged with its case ID (e.g. `@PDP-03`), so `npx playwright test --grep @PROMO-04`
runs one case. `@quarantine` is always excluded.

## Structure

```
config/      env + skip reasons
data/        catalog handles, promos, addresses, tax rules (one place to update per campaign)
pages/       Page Object Model (header, product, collection, cart drawer, checkout, portal, newsletter)
fixtures/    page objects + storefront cart client + Admin API + inbox, injected per test
utils/       storefront AJAX client, Admin GraphQL, Mailosaur, analytics, shared flows
tests/core/        Core 38, grouped by area
tests/regression/  everything else
tests/api/         browserless checks
```

## Production vs staging

Production is read-only: tests never press "Pay now" there, and signup forms are stubbed so no
test contacts reach real lists. Cases tagged `@staging` skip on production with a clear reason.
To run them, point `BASE_URL` at a staging store with the Bogus Gateway, set
`ALLOW_ORDER_PLACEMENT=true`, and fill the Admin API / Mailosaur / PayPal values in `.env`.

## Business rules to confirm

Some expectations live in `data/catalog.ts` and need confirmation from the business:
free-shipping rule, whether the free-gift threshold counts before discounts, which discounts
stack, and the Skio renewal order tag.
