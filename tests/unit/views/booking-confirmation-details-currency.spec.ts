/**
 * S152 16b — BookingConfirmationDetails prints the resource price in the
 * operating currency: S85.1 dropped ``currency`` from the resource payload, so
 * ``resource.currency`` left an empty gap ("50.00 /per_session"). Faked at the
 * transport (axios adapter).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { installFakeTransport } from '../support/fakeTransport';
import { useAppConfigStore } from '@/stores/appConfig';
import BookingConfirmationDetails from '../../../booking/components/BookingConfirmationDetails.vue';

const INVOICE = {
  line_items: [{ metadata: { plugin: 'booking', resource_slug: 'dr-smith', start_at: '2026-10-12T09:00:00' } }],
};

describe('BookingConfirmationDetails currency (S152 16b)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('shows the resource price with the operating currency', async () => {
    installFakeTransport({
      '/config': { default_currency: 'GBP' },
      '/booking/resources/dr-smith': { name: 'Dr. Smith', slug: 'dr-smith', price: '50.00', price_unit: 'per_session' },
      '/booking/bookings': { bookings: [] },
    });
    await useAppConfigStore().load();
    const wrapper = mount(BookingConfirmationDetails, {
      props: { invoiceId: 'inv-1', invoiceData: INVOICE },
      global: { mocks: { $t: (key: string) => key }, stubs: { RouterLink: RouterLinkStub } },
    });
    await flushPromises();

    expect(wrapper.find('.booking-price').text()).toBe('50.00 GBP/per_session');
  });
});
