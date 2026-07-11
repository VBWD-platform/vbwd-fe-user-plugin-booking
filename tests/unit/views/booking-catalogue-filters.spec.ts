/**
 * Catalogue-list wire contract — BOOKING FRONTEND slice.
 *
 * BookingCatalogue is the next consumer (after shop) of the shared fe-core
 * catalogue mechanism: the `<CatalogueFilterBar>` widget + the
 * `useCatalogueFilters()` URL-query composable, both exported from
 * `vbwd-view-component`. These oracle tests prove the seam end-to-end from the
 * booking side, INCLUDING the new date-range control:
 *   - on mount it fetches the booking facet descriptor (`GET /booking/filters`),
 *   - resolves each `options_endpoint` facet's options (schemas/categories/tags)
 *     and hands them to the bar,
 *   - renders the `availability` date-range control from the descriptor,
 *   - reads the CONTRACT envelope (`items`, NOT `resources`) + `pages`,
 *   - drives all filter + pagination + availability state through the URL query,
 *     refetching `GET /booking/resources` from `queryParams` on every change,
 *   - a date-range change writes `availability_from`/`availability_to` and
 *     refetches with those params.
 *
 * A REAL memory router is used (not a mock) so `router.push` from the composable
 * mutates `route.query` reactively and the component's refetch watcher fires —
 * exactly the runtime behaviour we want to lock down.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { api } from '@/api';
import BookingCatalogue from '../../../booking/views/BookingCatalogue.vue';

vi.mock('@/api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  missing: (_locale, key) => key,
  messages: { en: { price: { nettoTag: 'netto price' } } },
});

const FACETS_RESPONSE = {
  facets: [
    {
      key: 'type',
      label: 'Type',
      control: 'select',
      options_endpoint: '/api/v1/booking/schemas',
    },
    {
      key: 'category',
      label: 'Category',
      control: 'select',
      options_endpoint: '/api/v1/booking/categories',
    },
    {
      key: 'tags',
      label: 'Tags',
      control: 'chips',
      multi: true,
      and: true,
      options_endpoint: '/api/v1/booking/tags',
    },
    {
      key: 'availability',
      label: 'Availability',
      control: 'date-range',
    },
  ],
};

const SCHEMAS_RESPONSE = {
  schemas: [
    { slug: 'room', name: 'Room' },
    { slug: 'equipment', name: 'Equipment' },
  ],
};

const CATEGORIES_RESPONSE = {
  categories: [
    { slug: 'studios', name: 'Studios' },
    { slug: 'halls', name: 'Halls' },
  ],
};

const TAGS_RESPONSE = {
  tags: [
    { slug: 'seaview', name: 'Sea View' },
    { slug: 'quiet', name: 'Quiet' },
  ],
};

function makeItem(slug: string, tags: string[] = []) {
  return {
    id: `res-${slug}`,
    slug,
    name: `Resource ${slug}`,
    resource_type: 'room',
    price: '100.00',
    currency: 'EUR',
    price_unit: 'per_hour',
    capacity: 1,
    image_url: null,
    description: 'A resource',
    tags,
    pricing: {
      net_amount: '100.00',
      gross_amount: '119.00',
      effective_display_mode: 'brutto',
      prices_display_mode: 'brutto',
    },
  };
}

function envelope(items: Array<Record<string, unknown>>, pages = 1, total?: number) {
  return {
    items,
    total: total ?? items.length,
    page: 1,
    per_page: 12,
    pages,
  };
}

/**
 * Route `api.get(url)` to the right stub by path. The resources call is the
 * spy-able default so tests can assert refetch params.
 */
function installApiRoutes(resourcesEnvelope: Record<string, unknown>) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url.startsWith('/booking/filters')) return Promise.resolve(FACETS_RESPONSE);
    if (url.startsWith('/booking/schemas')) return Promise.resolve(SCHEMAS_RESPONSE);
    if (url.startsWith('/booking/categories')) return Promise.resolve(CATEGORIES_RESPONSE);
    if (url.startsWith('/booking/tags')) return Promise.resolve(TAGS_RESPONSE);
    if (url.startsWith('/booking/resources')) return Promise.resolve(resourcesEnvelope);
    return Promise.resolve({});
  });
}

function resourceUrls(): string[] {
  return vi.mocked(api.get).mock.calls
    .map((call) => call[0] as string)
    .filter((url) => url.startsWith('/booking/resources'));
}

async function mountCatalogue(
  resourcesEnvelope: Record<string, unknown>,
  initialPath = '/booking',
): Promise<{ wrapper: ReturnType<typeof mount>; router: Router }> {
  installApiRoutes(resourcesEnvelope);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/booking', name: 'booking-catalogue', component: { template: '<div/>' } },
      { path: '/booking/:slug', name: 'booking-resource', component: { template: '<div/>' } },
    ],
  });
  router.push(initialPath);
  await router.isReady();
  const wrapper = mount(BookingCatalogue, {
    global: {
      plugins: [i18n, router],
      stubs: { RouterLink: RouterLinkStub },
    },
  });
  await flushPromises();
  return { wrapper, router };
}

describe('BookingCatalogue — catalogue-list wire contract (booking consumer)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches the booking facet descriptor on mount', async () => {
    await mountCatalogue(envelope([makeItem('a')]));
    const urls = vi.mocked(api.get).mock.calls.map((call) => call[0] as string);
    expect(urls.some((url) => url.startsWith('/booking/filters'))).toBe(true);
  });

  it('renders the shared CatalogueFilterBar incl. the date-range control', async () => {
    const { wrapper } = await mountCatalogue(envelope([makeItem('a')]));
    expect(wrapper.find('[data-testid="catalogue-filter-bar"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="catalogue-facet-select-type"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="catalogue-facet-select-category"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="catalogue-facet-chip-tags-seaview"]').exists()).toBe(true);
    // The new date-range control (both bound inputs) renders from the descriptor.
    expect(
      wrapper.find('[data-testid="catalogue-facet-daterange-availability-from"]').exists(),
    ).toBe(true);
    expect(
      wrapper.find('[data-testid="catalogue-facet-daterange-availability-to"]').exists(),
    ).toBe(true);
  });

  it('reads the CONTRACT envelope (items, not resources)', async () => {
    const { wrapper } = await mountCatalogue(envelope([makeItem('alpha'), makeItem('beta')]));
    expect(wrapper.find('[data-testid="booking-resource-card-alpha"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="booking-resource-card-beta"]').exists()).toBe(true);
  });

  it('requests /booking/resources with page + per_page params', async () => {
    await mountCatalogue(envelope([makeItem('a')]));
    const url = resourceUrls()[0];
    expect(url).toContain('page=1');
    expect(url).toContain('per_page=');
  });

  it('renders a pager from `pages` and navigates via setPage', async () => {
    const { wrapper, router } = await mountCatalogue(envelope([makeItem('a')], 3, 30));
    const pager = wrapper.find('[data-testid="booking-catalogue-pager"]');
    expect(pager.exists()).toBe(true);
    await wrapper.find('[data-testid="booking-catalogue-next"]').trigger('click');
    await flushPromises();
    expect(Number(router.currentRoute.value.query.page)).toBe(2);
    expect(resourceUrls().some((url) => url.includes('page=2'))).toBe(true);
  });

  it('a facet change writes the URL query and refetches resources', async () => {
    const { wrapper, router } = await mountCatalogue(envelope([makeItem('a')]));
    const before = resourceUrls().length;
    wrapper
      .findComponent({ name: 'CatalogueFilterBar' })
      .vm.$emit('facet-change', 'category', 'studios');
    await flushPromises();
    expect(router.currentRoute.value.query.category).toBe('studios');
    const after = resourceUrls();
    expect(after.length).toBeGreaterThan(before);
    expect(after.some((url) => url.includes('category=studios'))).toBe(true);
  });

  it('a tag toggle writes the tags CSV to the query and refetches', async () => {
    const { wrapper, router } = await mountCatalogue(envelope([makeItem('a')]));
    wrapper
      .findComponent({ name: 'CatalogueFilterBar' })
      .vm.$emit('tag-toggle', 'seaview');
    await flushPromises();
    expect(router.currentRoute.value.query.tags).toBe('seaview');
    expect(resourceUrls().some((url) => url.includes('tags=seaview'))).toBe(true);
  });

  it('a date-range change writes availability_from/_to and refetches', async () => {
    const { wrapper, router } = await mountCatalogue(envelope([makeItem('a')]));
    const before = resourceUrls().length;
    wrapper
      .findComponent({ name: 'CatalogueFilterBar' })
      .vm.$emit('range-change', 'availability', { from: '2026-08-01', to: '2026-08-05' });
    await flushPromises();
    expect(router.currentRoute.value.query.availability_from).toBe('2026-08-01');
    expect(router.currentRoute.value.query.availability_to).toBe('2026-08-05');
    const after = resourceUrls();
    expect(after.length).toBeGreaterThan(before);
    expect(
      after.some(
        (url) =>
          url.includes('availability_from=2026-08-01') &&
          url.includes('availability_to=2026-08-05'),
      ),
    ).toBe(true);
  });

  it('passes the current date-range bounds back to the filter bar', async () => {
    const { wrapper } = await mountCatalogue(
      envelope([makeItem('a')]),
      '/booking?availability_from=2026-08-01&availability_to=2026-08-05',
    );
    const bar = wrapper.findComponent({ name: 'CatalogueFilterBar' });
    const dateRange = (bar.props() as { dateRange: Record<string, { from?: string; to?: string }> })
      .dateRange;
    expect(dateRange.availability).toEqual({ from: '2026-08-01', to: '2026-08-05' });
  });

  it('toggles the filter when a resource card tag is clicked', async () => {
    const { wrapper, router } = await mountCatalogue(envelope([makeItem('alpha', ['seaview'])]));
    const cardTag = wrapper.find('[data-testid="booking-resource-tag-alpha-seaview"]');
    expect(cardTag.exists()).toBe(true);
    await cardTag.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.tags).toBe('seaview');
  });
});
