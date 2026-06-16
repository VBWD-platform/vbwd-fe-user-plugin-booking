/**
 * S96.3 — BookingCheckout tax disclosure.
 *
 * The checkout must thread the resource ``pricing`` block (net/gross/taxes) and
 * render the shared tax components, mirroring shop/subscription:
 *   - <OrderTaxSummary> before the total when the order has taxes;
 *   - per-line <PriceBreakdown> only when the order is heterogeneous (the single
 *     resource carries more than one distinct tax rate);
 *   - nothing when the resource has no taxes;
 *   - the charge label (pay button / total) equals the brutto amount.
 *
 * The FE does NO tax math here — it sums pre-computed amounts via the shared
 * aggregator.
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

// Keep the real fe-core helpers (formatMoney/CouponInput/isZeroTotal) and only
// stub the auth store so <PriceDisplay> resolves an anonymous viewer without a
// fe-core Pinia install.
vi.mock('vbwd-view-component', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('vbwd-view-component');
  return { ...actual, useAuthStore: () => ({ user: null }) };
});

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  missing: (_locale: string, key: string) => key,
  messages: {
    en: {
      booking: { checkout: { payNow: 'Pay Now', total: 'Total' } },
      price: {
        net: 'Net',
        gross: 'Gross',
        taxLine: '{name} {rate}%',
        totalNet: 'Total net',
        totalTax: 'Total tax',
        totalTaxWithRate: 'Total tax ({rate}%)',
        totalGross: 'Total gross',
      },
    },
  },
});

type ResourcePricing = BookableResource['pricing'];

function makeResource(pricing: ResourcePricing, price = '100.00'): BookableResource {
  return {
    id: 'res-1',
    name: 'Room A',
    slug: 'room-a',
    description: 'A room',
    resource_type: 'room',
    capacity: 1,
    slot_duration_minutes: 60,
    price,
    price_unit: 'per_hour',
    availability: {},
    custom_fields_schema: null,
    image_url: null,
    images: [],
    categories: [],
    pricing,
  } as unknown as BookableResource;
}

async function mountCheckout(resource: BookableResource, quantity = 1) {
  const booking = useBookingStore();
  booking.currentResource = resource;
  booking.pendingCheckout = {
    resource_slug: resource.slug,
    start_at: '2026-06-20T10:00:00Z',
    end_at: '2026-06-20T11:00:00Z',
    quantity,
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

describe('BookingCheckout tax disclosure (S96.3)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const appConfig = useAppConfigStore();
    appConfig.load = vi.fn().mockResolvedValue(undefined);
  });

  it('renders <OrderTaxSummary> (net/tax/gross) for a taxed resource', async () => {
    const wrapper = await mountCheckout(
      makeResource({
        net_amount: '100.00',
        gross_amount: '119.00',
        tax_amount: '19.00',
        tax_rate: '19.00',
        taxes: [{ code: 'DE_VAT', name: 'VAT Germany', rate: '19.00', amount: '19.00' }],
      }),
      1,
    );

    expect(wrapper.find('[data-testid="order-tax-net"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="order-tax-net"]').text()).toContain('100');
    expect(wrapper.get('[data-testid="order-tax-total"]').text()).toContain('19');
    expect(wrapper.get('[data-testid="order-tax-gross"]').text()).toContain('119');
  });

  it('charges the brutto amount (pay button + total show gross, not net)', async () => {
    const wrapper = await mountCheckout(
      makeResource({
        net_amount: '100.00',
        gross_amount: '119.00',
        tax_amount: '19.00',
        tax_rate: '19.00',
        taxes: [{ code: 'DE_VAT', name: 'VAT Germany', rate: '19.00', amount: '19.00' }],
      }),
      1,
    );

    expect(wrapper.get('.pay-button').text()).toContain('119');
    expect(wrapper.get('[data-testid="order-total-amount"]').text()).toContain('119');
  });

  it('renders a per-line <PriceBreakdown> when the order is heterogeneous (multiple rates)', async () => {
    const wrapper = await mountCheckout(
      makeResource({
        net_amount: '100.00',
        gross_amount: '126.00',
        tax_amount: '26.00',
        tax_rate: '26.00',
        taxes: [
          { code: 'DE_VAT', name: 'VAT Germany', rate: '19.00', amount: '19.00' },
          { code: 'CITY_TAX', name: 'City Tax', rate: '7.00', amount: '7.00' },
        ],
      }),
      1,
    );

    expect(wrapper.find('[data-testid="resource-line-breakdown"]').exists()).toBe(true);
    const taxLines = wrapper.findAll('[data-testid="price-breakdown-tax-line"]');
    expect(taxLines.length).toBe(2);
  });

  it('renders NO tax breakdown when the resource has no taxes', async () => {
    const wrapper = await mountCheckout(
      makeResource({
        net_amount: '80.00',
        gross_amount: '80.00',
        tax_amount: '0.00',
        tax_rate: '0.00',
        taxes: [],
      }),
      1,
    );

    expect(wrapper.find('[data-testid="order-tax-net"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="resource-line-breakdown"]').exists()).toBe(false);
    expect(wrapper.get('.pay-button').text()).toContain('80');
  });
});
