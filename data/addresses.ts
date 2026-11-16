import type { Address } from '../pages/CheckoutPage';

const base = { firstName: 'QA', lastName: 'Automation', email: 'qa+automation@example.com' };

export const addresses = {
  newYork: { ...base, address1: '350 5th Ave', city: 'New York', state: 'New York', zip: '10118' },
  california: { ...base, address1: '200 N Spring St', city: 'Los Angeles', state: 'California', zip: '90012' },
  texas: { ...base, address1: '1100 Congress Ave', city: 'Austin', state: 'Texas', zip: '78701' },
  oregon: { ...base, address1: '1221 SW 4th Ave', city: 'Portland', state: 'Oregon', zip: '97204' },
  alaska: { ...base, address1: '632 W 6th Ave', city: 'Anchorage', state: 'Alaska', zip: '99501' },
  hawaii: { ...base, address1: '415 S Beretania St', city: 'Honolulu', state: 'Hawaii', zip: '96813' },
} satisfies Record<string, Address>;

/**
 * CHK-04. 'zero' = no sales tax expected; 'positive' = some tax expected.
 * Replace 'positive' with exact rates once the tax team confirms how sunscreen
 * (an OTC drug) is taxed per state.
 */
export const taxExpectations: { address: keyof typeof addresses; expect: 'zero' | 'positive' }[] = [
  { address: 'newYork', expect: 'positive' },
  { address: 'california', expect: 'positive' },
  { address: 'texas', expect: 'positive' },
  { address: 'oregon', expect: 'zero' },
];
