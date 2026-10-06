/**
 * S152 16b — BookingForm:
 *  - builds ``start_at`` / ``end_at`` from both slot formats the detail page can
 *    forward ("09:00" and the ISO "2026-10-12T09:00:00", as formatSlotTime
 *    already accepts) — it concatenated ``T${start}:00`` and broke on ISO;
 *  - shows the operating currency (``/config`` default_currency), since S85.1
 *    dropped ``currency`` from the resource payload ("50.00 undefined / hour").
 * Faked at the transport (axios adapter).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { installFakeTransport } from '../support/fakeTransport';
import { useAppConfigStore } from '@/stores/appConfig';
import { useBookingStore } from '../../../booking/stores/booking';

const { routeQuery, routerPush } = vi.hoisted(() => ({
  routeQuery: {} as Record<string, string>,
  routerPush: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { slug: 'dr-smith' }, query: routeQuery }),
  useRouter: () => ({ push: routerPush }),
}));

import BookingForm from '../../../booking/views/BookingForm.vue';

// A resource WITHOUT ``currency`` — the post-S85.1 payload.
const RESOURCE = {
  id: 'res-1',
  name: 'Dr. Smith',
  slug: 'dr-smith',
  resource_type: 'specialist',
  slot_duration_minutes: 30,
  price: '50.00',
  price_unit: 'per_hour',
  custom_fields_schema: [],
  image_url: null,
};

async function mountForm(query: Record<string, string>) {
  Object.keys(routeQuery).forEach((key) => delete routeQuery[key]);
  Object.assign(routeQuery, query);
  installFakeTransport({
    '/config': { default_currency: 'GBP' },
    '/booking/resources/dr-smith': RESOURCE,
  });
  await useAppConfigStore().load();
  const wrapper = mount(BookingForm, { global: { mocks: { $t: (key: string) => key } } });
  await flushPromises();
  return wrapper;
}

describe('BookingForm slot times + currency (S152 16b)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    routerPush.mockReset();
  });

  it.each([
    ['HH:MM', { date: '2026-10-12', start: '09:00', end: '09:30' }],
    ['ISO', { date: '2026-10-12', start: '2026-10-12T09:00:00', end: '2026-10-12T09:30:00' }],
  ])('builds start_at / end_at from a %s slot', async (_format, query) => {
    const wrapper = await mountForm(query);
    await wrapper.find('form').trigger('submit');

    const pending = useBookingStore().pendingCheckout;
    expect(pending?.start_at).toBe('2026-10-12T09:00:00');
    expect(pending?.end_at).toBe('2026-10-12T09:30:00');
    expect(wrapper.text()).toContain('09:00 – 09:30');
  });

  it('shows the operating currency, never "undefined"', async () => {
    const wrapper = await mountForm({ date: '2026-10-12', start: '09:00', end: '09:30' });
    const priceLine = wrapper.find('.ghrm-detail-author').text();

    expect(priceLine).toContain('50.00 GBP');
    expect(priceLine).not.toContain('undefined');
  });
});
