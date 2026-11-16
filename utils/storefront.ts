import { expect, type APIRequestContext } from '@playwright/test';

/**
 * Thin client over Shopify's public AJAX API (/products/*.js, /cart/*.js).
 * Use page.request inside UI tests so the cart cookie is SHARED with the browser:
 * seed the cart through the API, verify through the UI (fast + deterministic).
 */
export interface Variant {
  id: number;
  title: string;
  price: number; // cents
  compare_at_price: number | null;
  available: boolean;
  option1: string | null;
}
export interface SellingPlanGroup {
  name: string;
  app_id: string;
  selling_plans: { id: number; name: string; price_adjustments: { value_type: string; value: number }[] }[];
}
export interface ProductJson {
  id: number;
  handle: string;
  title: string;
  type: string;
  available: boolean;
  variants: Variant[];
  selling_plan_groups: SellingPlanGroup[];
}
export interface CartLine {
  key: string;
  handle: string;
  variant_id: number;
  quantity: number;
  final_line_price: number;
  properties: Record<string, string> | null;
  selling_plan_allocation?: { selling_plan: { id: number; name: string } };
}
export interface Cart {
  token: string;
  item_count: number;
  total_price: number;
  items_subtotal_price: number;
  currency: string;
  items: CartLine[];
}

export class Storefront {
  constructor(private readonly request: APIRequestContext) {}

  async product(handle: string): Promise<ProductJson> {
    const res = await this.request.get(`/products/${handle}.js`);
    expect(res.status(), `GET /products/${handle}.js`).toBe(200);
    return res.json();
  }

  async firstAvailableVariant(handle: string, option?: string): Promise<Variant> {
    const p = await this.product(handle);
    const v = p.variants.find((x) => x.available && (!option || x.title === option || x.option1 === option));
    if (!v) throw new Error(`No available variant for ${handle}${option ? ` (${option})` : ''}`);
    return v;
  }

  async cart(): Promise<Cart> {
    const res = await this.request.get('/cart.js');
    expect(res.ok()).toBeTruthy();
    return res.json();
  }

  async add(variantId: number, quantity = 1, sellingPlan?: number) {
    const res = await this.request.post('/cart/add.js', {
      data: { items: [{ id: variantId, quantity, ...(sellingPlan ? { selling_plan: sellingPlan } : {}) }] },
    });
    expect(res.status(), `cart/add ${variantId}: ${await res.text()}`).toBe(200);
    return res.json();
  }

  async change(lineKey: string, quantity: number): Promise<Cart> {
    const res = await this.request.post('/cart/change.js', { data: { id: lineKey, quantity } });
    expect(res.ok()).toBeTruthy();
    return res.json();
  }

  async clear(): Promise<Cart> {
    const res = await this.request.post('/cart/clear.js');
    expect(res.ok()).toBeTruthy();
    return res.json();
  }

  /** Paid lines only (excludes auto-added free gifts). */
  static paidLines(cart: Cart) {
    return cart.items.filter((i) => i.properties?._free_product !== 'true');
  }
  static giftLines(cart: Cart) {
    return cart.items.filter((i) => i.properties?._free_product === 'true');
  }
}

export const usd = (cents: number) => cents / 100;
