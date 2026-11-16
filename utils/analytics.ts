import type { Page } from '@playwright/test';

/** Elevar pushes ecommerce events to window.dataLayer as dl_* events. */
export interface DataLayerEvent {
  event: string;
  ecommerce?: any;
}

export async function dataLayerEvents(page: Page, name?: string): Promise<DataLayerEvent[]> {
  const events: DataLayerEvent[] = await page.evaluate(() =>
    ((window as any).dataLayer ?? [])
      .filter((e: any) => e && typeof e.event === 'string')
      .map((e: any) => JSON.parse(JSON.stringify({ event: e.event, ecommerce: e.ecommerce }))),
  );
  return name ? events.filter((e) => e.event === name) : events;
}

/** Product objects inside an Elevar ecommerce payload (add / detail / click / purchase). */
export function ecommerceProducts(e: DataLayerEvent): any[] {
  const ec = e.ecommerce ?? {};
  return ec.add?.products ?? ec.detail?.products ?? ec.click?.products ?? ec.purchase?.products ?? ec.products ?? [];
}
