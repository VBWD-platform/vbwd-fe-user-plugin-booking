/**
 * S96.3 — booking checkout tax breakdown.
 *
 * The booking equivalent of shop's CheckoutSource.getTaxBreakdown(): it must
 * aggregate the resource's per-unit Price VO (from the API ``pricing`` block)
 * × quantity into one order Price VO — net + per-rate taxes + brutto — using
 * the shared aggregator. Display only: it sums pre-computed amounts and never
 * derives a tax rate.
 */
import { describe, it, expect } from 'vitest';
import { getBookingTaxBreakdown } from '../../booking/checkoutSource';
import type { BookableResource } from '../../booking/stores/booking';

function makeResource(pricing: BookableResource['pricing'], price = '100.00'): BookableResource {
  return {
    id: 'res-1',
    name: 'Room A',
    slug: 'room-a',
    description: 'A room',
    resource_type: 'room',
    capacity: 1,
    slot_duration_minutes: 60,
    price,
    currency: 'EUR',
    price_unit: 'per_hour',
    availability: {},
    custom_fields_schema: null,
    image_url: null,
    images: [],
    categories: [],
    pricing,
  };
}

describe('getBookingTaxBreakdown (S96.3)', () => {
  it('aggregates the resource VO × quantity (net / per-rate tax / brutto)', () => {
    const resource = makeResource({
      net_amount: '100.00',
      gross_amount: '119.00',
      tax_amount: '19.00',
      tax_rate: '19.00',
      taxes: [{ code: 'DE_VAT', name: 'VAT Germany', rate: '19.00', amount: '19.00' }],
    });

    const order = getBookingTaxBreakdown(resource, 3, 'EUR');

    expect(order.netto).toBeCloseTo(300, 2);
    expect(order.brutto).toBeCloseTo(357, 2);
    expect(order.currency).toBe('EUR');
    expect(order.taxes).toHaveLength(1);
    expect(order.taxes[0].code).toBe('DE_VAT');
    expect(order.taxes[0].rate).toBe(19);
    expect(order.taxes[0].amount).toBeCloseTo(57, 2);
  });

  it('returns no tax lines when the resource has no taxes (net == gross)', () => {
    const resource = makeResource({
      net_amount: '50.00',
      gross_amount: '50.00',
      tax_amount: '0.00',
      tax_rate: '0.00',
      taxes: [],
    });

    const order = getBookingTaxBreakdown(resource, 2, 'EUR');

    expect(order.taxes).toHaveLength(0);
    expect(order.netto).toBeCloseTo(100, 2);
    expect(order.brutto).toBeCloseTo(100, 2);
  });

  it('falls back to the bare gross price (net == gross, no tax) without a pricing block', () => {
    const resource = makeResource(undefined, '80.00');

    const order = getBookingTaxBreakdown(resource, 1, 'EUR');

    expect(order.taxes).toHaveLength(0);
    expect(order.netto).toBeCloseTo(80, 2);
    expect(order.brutto).toBeCloseTo(80, 2);
  });

  it('returns an empty breakdown for a missing resource', () => {
    const order = getBookingTaxBreakdown(null, 1, 'EUR');
    expect(order.taxes).toHaveLength(0);
    expect(order.netto).toBe(0);
    expect(order.brutto).toBe(0);
  });
});
