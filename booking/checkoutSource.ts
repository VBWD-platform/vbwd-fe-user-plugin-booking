/**
 * Booking checkout tax breakdown — the booking equivalent of the shop
 * CheckoutSource's ``getTaxBreakdown()`` (S96.3).
 *
 * Booking is a single-resource checkout (its own standalone BookingCheckout
 * view, not the generic /checkout page), so there is no cart store to aggregate.
 * This module exposes the SAME display-only aggregation contract: it builds the
 * resource's per-unit Price VO from the ``pricing`` block the API already
 * returns (net_amount / gross_amount / taxes) and runs it through the shared
 * ``aggregatePrice`` aggregator × quantity. It performs NO tax math — it sums
 * pre-computed amounts and groups them by code+rate, exactly like shop.
 */
import { aggregatePrice } from '@/utils/aggregatePrice';
import type { PriceVO } from '@/utils/priceDisplay';
import type { BookableResource } from './stores/booking';

/**
 * Order-level tax breakdown for a booking: the resource's per-unit Price VO
 * (netto=net_amount, brutto=gross_amount, taxes with Number(rate)) summed ×
 * quantity by the shared aggregator. Falls back to the bare gross ``price``
 * (net == gross, no tax line) when the resource carries no ``pricing`` block.
 */
export function getBookingTaxBreakdown(
  resource: BookableResource | null,
  quantity: number,
  defaultCurrency: string,
): PriceVO {
  const units = Math.max(1, quantity || 1);
  if (!resource) {
    return aggregatePrice([], defaultCurrency);
  }

  const pricing = resource.pricing;
  const grossFallback = Number(resource.price || 0);
  const currency = defaultCurrency;

  const priceVO: PriceVO | null = pricing
    ? {
        netto: Number(pricing.net_amount),
        taxes: (pricing.taxes ?? []).map((tax) => ({
          code: tax.code,
          name: tax.name,
          rate: Number(tax.rate),
          amount: Number(tax.amount),
        })),
        brutto: Number(pricing.gross_amount),
        currency,
      }
    : null;

  return aggregatePrice(
    [
      {
        priceVO,
        grossFallback,
        quantity: units,
        currency,
      },
    ],
    currency,
  );
}
