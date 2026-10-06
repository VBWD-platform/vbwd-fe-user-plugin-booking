/**
 * S152 16b — BookingSuccess reads the booking line from ``line_items[].metadata``.
 *
 * ``InvoiceLineItem.to_dict`` publishes the line's extra data as ``metadata``
 * (never ``extra_data``), so reading ``extra_data`` meant the booking card never
 * rendered. Faked at the transport (axios adapter).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises, RouterLinkStub } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { installFakeTransport } from '../support/fakeTransport';

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { invoice_id: 'inv-1' } }),
}));

import BookingSuccess from '../../../booking/views/BookingSuccess.vue';

const i18n = createI18n({ legacy: false, locale: 'en', missing: (_locale, key) => key, messages: { en: {} } });

const BOOKING_INVOICE = {
  invoice_number: 'BK-0001',
  status: 'paid',
  amount: '50.00',
  total_amount: '50.00',
  currency: 'EUR',
  line_items: [
    {
      type: 'booking',
      description: 'Dr. Smith',
      metadata: {
        plugin: 'booking',
        resource_slug: 'dr-smith',
        resource_name: 'Dr. Smith',
        start_at: '2026-10-12T09:00:00',
        end_at: '2026-10-12T09:30:00',
        notes: 'Bring the referral',
      },
    },
  ],
};

const RESOURCE = { name: 'Dr. Smith', slug: 'dr-smith', resource_type: 'specialist', price: '50.00', price_unit: 'per_session' };

function mountSuccess() {
  return mount(BookingSuccess, { global: { plugins: [i18n], stubs: { RouterLink: RouterLinkStub } } });
}

describe('BookingSuccess — booking line metadata (S152 16b)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the booking card from the line metadata and the fetched resource', async () => {
    const requested = installFakeTransport({
      '/user/invoices/inv-1': BOOKING_INVOICE,
      '/booking/resources/dr-smith': RESOURCE,
    });
    const wrapper = mountSuccess();
    await flushPromises();

    expect(requested).toContain('/booking/resources/dr-smith');
    expect(wrapper.text()).toContain('booking.success.bookingDetails');
    expect(wrapper.findComponent(RouterLinkStub).props('to')).toBe('/booking/dr-smith');
    expect(wrapper.text()).toContain('Dr. Smith');
    expect(wrapper.text()).toContain('Bring the referral');
  });

  it('falls back to the metadata resource name when the resource lookup fails', async () => {
    installFakeTransport({ '/user/invoices/inv-1': BOOKING_INVOICE });
    const wrapper = mountSuccess();
    await flushPromises();

    expect(wrapper.text()).toContain('booking.success.bookingDetails');
    expect(wrapper.text()).toContain('Dr. Smith');
  });
});
