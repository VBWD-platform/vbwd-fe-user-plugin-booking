/**
 * S72.4 follow-up — netto/brutto wiring in the booking catalogue LIST cards.
 *
 * BookingCatalogue renders the shared <PriceDisplay> on each resource card, fed
 * by the per-item ``pricing`` block (net_amount/gross_amount + effective/global
 * display modes) embedded by the list endpoint. These oracle tests assert the
 * net-vs-gross choice and the "netto price" tag for the three modes, plus a
 * graceful fallback when an (older-cached) resource has no ``pricing`` block.
 *
 * Since the catalogue was rewritten to consume the shared fe-core catalogue
 * mechanism (useCatalogueFilters + CatalogueFilterBar), the cards flow from the
 * ``items`` envelope of ``GET /booking/resources`` — so this harness feeds them
 * through the api mock + a real memory router (the composable reads the URL).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { createRouter, createMemoryHistory } from 'vue-router';
import { api } from '@/api';
import BookingCatalogue from '../../../booking/views/BookingCatalogue.vue';
import type { BookableResource } from '../../../booking/stores/booking';

vi.mock('@/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  missing: (_locale, key) => key,
  messages: { en: { price: { nettoTag: 'netto price' } } },
});

function makeResource(slug: string, pricing?: BookableResource['pricing']): BookableResource {
  return {
    id: `res-${slug}`,
    name: `Resource ${slug}`,
    slug,
    description: 'A resource',
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

function envelope(items: BookableResource[]) {
  return { items, total: items.length, page: 1, per_page: 12, pages: 1 };
}

async function mountWithResources(resources: BookableResource[]) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.startsWith('/booking/filters')) return Promise.resolve({ facets: [] });
    if (url.startsWith('/booking/resources')) return Promise.resolve(envelope(resources));
    return Promise.resolve({});
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/booking', name: 'booking-catalogue', component: { template: '<div/>' } },
      { path: '/booking/:slug', name: 'booking-resource', component: { template: '<div/>' } },
    ],
  });
  router.push('/booking');
  await router.isReady();
  const wrapper = mount(BookingCatalogue, {
    global: {
      plugins: [i18n, router],
      stubs: { RouterLink: RouterLinkStub },
    },
  });
  await flushPromises();
  return wrapper;
}

describe('BookingCatalogue card price display (S72.4 follow-up)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('shows the NET amount + netto tag for a netto card under a brutto global', async () => {
    const wrapper = await mountWithResources([
      makeResource('netto-one', {
        net_amount: '100.00',
        gross_amount: '119.00',
        effective_display_mode: 'netto',
        prices_display_mode: 'brutto',
      }),
    ]);
    const amount = wrapper.get('[data-testid="price-amount"]').text();
    expect(amount).toContain('100');
    expect(amount).not.toContain('119');
    expect(wrapper.find('[data-testid="price-netto-tag"]').exists()).toBe(true);
  });

  it('shows the GROSS amount and no tag for a brutto card', async () => {
    const wrapper = await mountWithResources([
      makeResource('brutto-one', {
        net_amount: '100.00',
        gross_amount: '119.00',
        effective_display_mode: 'brutto',
        prices_display_mode: 'brutto',
      }),
    ]);
    const amount = wrapper.get('[data-testid="price-amount"]').text();
    expect(amount).toContain('119');
    expect(amount).not.toContain('100');
    expect(wrapper.find('[data-testid="price-netto-tag"]').exists()).toBe(false);
  });

  it('renders a price gracefully when a resource has no pricing block', async () => {
    const wrapper = await mountWithResources([makeResource('no-pricing')]);
    const amount = wrapper.get('[data-testid="price-amount"]').text();
    expect(amount).toContain('100');
    expect(wrapper.find('[data-testid="price-netto-tag"]').exists()).toBe(false);
  });
});
