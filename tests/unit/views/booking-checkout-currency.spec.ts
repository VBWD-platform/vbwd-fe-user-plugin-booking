/**
 * S93 Slice A — BookingCheckout currency.
 *
 * S85.1 dropped `currency` from `booking_resource`, so the old
 * `resource.currency` rendered "undefined" (e.g. "Pay Now 189.00 undefined").
 * The view must use the global operating currency (app-config) and format every
 * amount via `formatMoney` — no "undefined", a real currency symbol.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import BookingCheckout from '../../../booking/views/BookingCheckout.vue';
import { useBookingStore, type BookableResource } from '../../../booking/stores/booking';
import { useAppConfigStore } from '@/stores/appConfig';

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  isAuthenticated: vi.fn(() => true),
}));

vi.mock('@/registries/checkoutPaymentMethods', () => ({
  getCheckoutPaymentMethod: vi.fn(() => undefined),
}));

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  missing: (_locale: string, key: string) => key,
  messages: { en: { booking: { checkout: { payNow: 'Pay Now' } } } },
});

// A resource WITHOUT a `currency` field — mirrors the post-S85.1 payload.
function makeResourceWithoutCurrency(): BookableResource {
  return {
    id: 'res-1',
    name: 'Room A',
    slug: 'room-a',
    description: 'A room',
    resource_type: 'room',
    capacity: 1,
    slot_duration_minutes: 60,
    price: '189.00',
    price_unit: 'per_hour',
    availability: {},
    custom_fields_schema: null,
    image_url: null,
    images: [],
    categories: [],
    pricing: undefined,
  } as unknown as BookableResource;
}

async function mountCheckout() {
  const booking = useBookingStore();
  booking.currentResource = makeResourceWithoutCurrency();
  booking.pendingCheckout = {
    resource_slug: 'room-a',
    start_at: '2026-06-20T10:00:00Z',
    end_at: '2026-06-20T11:00:00Z',
    quantity: 1,
  };
  vi.spyOn(booking, 'fetchResourceBySlug').mockResolvedValue(undefined as never);

  const wrapper = mount(BookingCheckout, {
    global: {
      plugins: [i18n],
      stubs: {
        RouterLink: RouterLinkStub,
        EmailBlock: true,
        PaymentMethodsBlock: true,
        TermsCheckbox: true,
        BillingAddressBlock: true,
        CouponInput: true,
      },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('BookingCheckout currency (S93)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Default operating currency without hitting the network.
    const appConfig = useAppConfigStore();
    appConfig.load = vi.fn().mockResolvedValue(undefined);
  });

  it('renders the Pay-Now amount with a currency symbol, never "undefined"', async () => {
    const wrapper = await mountCheckout();
    const payButton = wrapper.get('.pay-button').text();
    expect(payButton).toContain('189.00');
    expect(payButton).not.toContain('undefined');
    // EUR baseline → euro symbol.
    expect(payButton).toContain('€');
  });

  it('renders the order total via formatMoney (no "undefined")', async () => {
    const wrapper = await mountCheckout();
    const total = wrapper.get('[data-testid="order-total-amount"]').text();
    expect(total).toContain('189.00');
    expect(total).not.toContain('undefined');
  });
});
