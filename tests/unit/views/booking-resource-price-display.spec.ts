/**
 * S72.4 — netto/brutto wiring in the booking resource-detail price surface.
 *
 * BookingResourceDetail renders the shared <PriceDisplay> fed by the resource
 * ``pricing`` block (net_amount/gross_amount + effective/global display modes).
 * These oracle tests assert the net-vs-gross choice and the "netto price" tag
 * for the three modes, using the real detail component + a stubbed store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import BookingResourceDetail from '../../../booking/views/BookingResourceDetail.vue';
import { useBookingStore, type BookableResource } from '../../../booking/stores/booking';

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { slug: 'room-a' } }),
  useRouter: () => ({ push: vi.fn() }),
}));

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  missing: (_locale, key) => key,
  messages: { en: { price: { nettoTag: 'netto price' } } },
});

function makeResource(pricing: BookableResource['pricing']): BookableResource {
  return {
    id: 'res-1',
    name: 'Room A',
    slug: 'room-a',
    description: 'A room',
    resource_type: 'room',
    capacity: 1,
    slot_duration_minutes: 60,
    price: '100.00',
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

async function mountWithResource(pricing: BookableResource['pricing']) {
  const store = useBookingStore();
  store.currentResource = makeResource(pricing);
  // The component refetches on mount; keep the seeded resource + loading=false.
  vi.spyOn(store, 'fetchResourceBySlug').mockResolvedValue(undefined as never);
  const wrapper = mount(BookingResourceDetail, {
    global: {
      plugins: [i18n],
      stubs: { RouterLink: RouterLinkStub },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('BookingResourceDetail price display (S72.4)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('shows the NET amount + netto tag for a netto resource under a brutto global', async () => {
    const wrapper = await mountWithResource({
      net_amount: '100.00',
      gross_amount: '119.00',
      effective_display_mode: 'netto',
      prices_display_mode: 'brutto',
    });
    const amount = wrapper.get('[data-testid="price-amount"]').text();
    expect(amount).toContain('100');
    expect(amount).not.toContain('119');
    expect(wrapper.find('[data-testid="price-netto-tag"]').exists()).toBe(true);
  });

  it('shows the GROSS amount and no tag for a brutto resource', async () => {
    const wrapper = await mountWithResource({
      net_amount: '100.00',
      gross_amount: '119.00',
      effective_display_mode: 'brutto',
      prices_display_mode: 'brutto',
    });
    const amount = wrapper.get('[data-testid="price-amount"]').text();
    expect(amount).toContain('119');
    expect(amount).not.toContain('100');
    expect(wrapper.find('[data-testid="price-netto-tag"]').exists()).toBe(false);
  });

  it('shows net everywhere and no tag under a global netto', async () => {
    const wrapper = await mountWithResource({
      net_amount: '100.00',
      gross_amount: '119.00',
      effective_display_mode: 'netto',
      prices_display_mode: 'netto',
    });
    const amount = wrapper.get('[data-testid="price-amount"]').text();
    expect(amount).toContain('100');
    expect(wrapper.find('[data-testid="price-netto-tag"]').exists()).toBe(false);
  });
});
