/**
 * S77 — the booking resource detail renders tags + custom fields from the
 * serialized payload via the shared fe-core read-only display components.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { TagChips, CustomFieldsDisplay } from 'vbwd-view-component';
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
  messages: { en: {} },
});

function makeResource(overrides: Partial<BookableResource>): BookableResource {
  return {
    id: 'res-1', name: 'Room A', slug: 'room-a', description: 'A room', resource_type: 'room',
    capacity: 1, slot_duration_minutes: 60, price: '100.00', currency: 'EUR',
    price_unit: 'per_hour', availability: {}, custom_fields_schema: null, image_url: null,
    images: [], categories: [],
    pricing: { net_amount: '100.00', gross_amount: '119.00' },
    ...overrides,
  };
}

async function mountWith(overrides: Partial<BookableResource>) {
  const store = useBookingStore();
  store.currentResource = makeResource(overrides);
  vi.spyOn(store, 'fetchResourceBySlug').mockResolvedValue(undefined as never);
  const wrapper = mount(BookingResourceDetail, {
    global: { plugins: [i18n], stubs: { RouterLink: RouterLinkStub } },
  });
  await flushPromises();
  return wrapper;
}

describe('BookingResourceDetail — S77 tags + custom fields', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders TagChips + CustomFieldsDisplay from the payload keys', async () => {
    const wrapper = await mountWith({
      tags: ['seaview'],
      custom_fields: { floor: 3 },
      custom_field_defs: [{ key: 'floor', label: 'Floor', type: 'number' }],
    });

    expect(wrapper.find('[data-testid="resource-tags-custom-fields"]').exists()).toBe(true);
    const tagChips = wrapper.findComponent(TagChips);
    expect(tagChips.exists()).toBe(true);
    expect((tagChips.props() as { tags: string[] }).tags).toEqual(['seaview']);
    expect(wrapper.findComponent(CustomFieldsDisplay).exists()).toBe(true);
  });

  it('hides the block when there are no tags or custom fields', async () => {
    const wrapper = await mountWith({ tags: [], custom_fields: {} });

    expect(wrapper.find('[data-testid="resource-tags-custom-fields"]').exists()).toBe(false);
  });
});
