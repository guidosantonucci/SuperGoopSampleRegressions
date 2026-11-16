import { request, expect, type APIRequestContext } from '@playwright/test';
import { env } from '../config/env';

/**
 * Minimal Shopify Admin GraphQL client for staging setup/verification.
 * Token comes from a staging custom app with the smallest scopes needed.
 * Pin the API version and bump it deliberately each quarter.
 */
export class AdminApi {
  private constructor(private readonly ctx: APIRequestContext) {}

  static async create(): Promise<AdminApi> {
    const ctx = await request.newContext({
      baseURL: `https://${env.admin.storeDomain}/admin/api/${env.admin.apiVersion}/`,
      extraHTTPHeaders: { 'X-Shopify-Access-Token': env.admin.token, 'Content-Type': 'application/json' },
    });
    return new AdminApi(ctx);
  }

  async dispose() {
    await this.ctx.dispose();
  }

  async gql<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const res = await this.ctx.post('graphql.json', { data: { query, variables } });
    expect(res.ok(), `Admin API HTTP ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body.errors, JSON.stringify(body.errors)).toBeUndefined();
    return body.data;
  }

  private static assertNoUserErrors(payload: { userErrors?: { message: string }[] }) {
    expect(payload.userErrors ?? [], JSON.stringify(payload.userErrors)).toEqual([]);
  }

  /** % off code. combinesWith controls stacking with other discount classes. */
  async createPercentCode(opts: {
    code: string;
    percent: number; // 0.1 = 10%
    combinesWith?: { productDiscounts?: boolean; orderDiscounts?: boolean; shippingDiscounts?: boolean };
  }): Promise<string> {
    const data = await this.gql(
      `mutation($d: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $d) { codeDiscountNode { id } userErrors { field message } }
      }`,
      {
        d: {
          title: `QA ${opts.code}`,
          code: opts.code,
          startsAt: new Date(Date.now() - 60_000).toISOString(),
          customerSelection: { all: true },
          customerGets: { value: { percentage: opts.percent }, items: { all: true } },
          combinesWith: { productDiscounts: false, orderDiscounts: false, shippingDiscounts: true, ...opts.combinesWith },
        },
      },
    );
    AdminApi.assertNoUserErrors(data.discountCodeBasicCreate);
    return data.discountCodeBasicCreate.codeDiscountNode.id;
  }

  /** Automatic % off with a time window (PROMO-09). */
  async createScheduledAutomatic(opts: { title: string; percent: number; startsAt: Date; endsAt: Date }): Promise<string> {
    const data = await this.gql(
      `mutation($d: DiscountAutomaticBasicInput!) {
        discountAutomaticBasicCreate(automaticBasicDiscount: $d) { automaticDiscountNode { id } userErrors { field message } }
      }`,
      {
        d: {
          title: opts.title,
          startsAt: opts.startsAt.toISOString(),
          endsAt: opts.endsAt.toISOString(),
          customerGets: { value: { percentage: opts.percent }, items: { all: true } },
          combinesWith: { productDiscounts: true, orderDiscounts: false, shippingDiscounts: true },
        },
      },
    );
    AdminApi.assertNoUserErrors(data.discountAutomaticBasicCreate);
    return data.discountAutomaticBasicCreate.automaticDiscountNode.id;
  }

  async deleteCodeDiscount(id: string) {
    await this.gql(`mutation($id: ID!) { discountCodeDelete(id: $id) { userErrors { message } } }`, { id });
  }

  async deleteAutomaticDiscount(id: string) {
    await this.gql(`mutation($id: ID!) { discountAutomaticDelete(id: $id) { userErrors { message } } }`, { id });
  }

  /** Latest order for an email (orders placed by tests use unique emails). */
  async latestOrderFor(email: string) {
    const data = await this.gql(
      `query($q: String!) {
        orders(first: 1, sortKey: CREATED_AT, reverse: true, query: $q) { nodes {
          id name email tags displayFinancialStatus displayFulfillmentStatus
          totalPriceSet { shopMoney { amount } }
          subtotalPriceSet { shopMoney { amount } }
          totalShippingPriceSet { shopMoney { amount } }
          totalTaxSet { shopMoney { amount } }
          lineItems(first: 50) { nodes {
            title variantTitle quantity sku
            variant { id }
            customAttributes { key value }
            discountedTotalSet { shopMoney { amount } }
            sellingPlan { name }
          } }
        } }
      }`,
      { q: `email:${email}` },
    );
    return data.orders.nodes[0] ?? null;
  }

  /** Most recent subscription renewal order (Skio tags them). */
  async latestOrderTagged(tag: string) {
    const data = await this.gql(
      `query($q: String!) {
        orders(first: 1, sortKey: CREATED_AT, reverse: true, query: $q) { nodes {
          id name tags createdAt
          totalShippingPriceSet { shopMoney { amount } }
          lineItems(first: 20) { nodes {
            title quantity variant { id price }
            originalUnitPriceSet { shopMoney { amount } }
            discountedUnitPriceAfterAllDiscountsSet { shopMoney { amount } }
          } }
        } }
      }`,
      { q: `tag:'${tag}'` },
    );
    return data.orders.nodes[0] ?? null;
  }

  /** Available quantity + ids needed to change stock for a variant (PROMO-07). */
  async variantInventory(variantNumericId: number) {
    const data = await this.gql(
      `query($id: ID!) { productVariant(id: $id) { inventoryItem { id inventoryLevels(first: 1) { nodes {
        location { id } quantities(names: ["available"]) { quantity } } } } } }`,
      { id: `gid://shopify/ProductVariant/${variantNumericId}` },
    );
    const item = data.productVariant.inventoryItem;
    const level = item.inventoryLevels.nodes[0];
    return { inventoryItemId: item.id as string, locationId: level.location.id as string, available: level.quantities[0].quantity as number };
  }

  async setAvailable(inventoryItemId: string, locationId: string, quantity: number) {
    const data = await this.gql(
      `mutation($input: InventorySetQuantitiesInput!) { inventorySetQuantities(input: $input) { userErrors { field message } } }`,
      { input: { name: 'available', reason: 'correction', ignoreCompareQuantity: true, quantities: [{ inventoryItemId, locationId, quantity }] } },
    );
    AdminApi.assertNoUserErrors(data.inventorySetQuantities);
  }
}

export const money = (m: { shopMoney: { amount: string } }) => Math.round(parseFloat(m.shopMoney.amount) * 100);
