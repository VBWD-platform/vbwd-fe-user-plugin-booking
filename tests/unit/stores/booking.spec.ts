import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBookingStore } from '../../../booking/stores/booking';

vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '@/api';

describe('useBookingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetchCategories populates categories', async () => {
    vi.mocked(api.get).mockResolvedValue({
      categories: [
        { id: '1', name: 'Medical', slug: 'medical' },
        { id: '2', name: 'Workspace', slug: 'workspace' },
      ],
    });

    const store = useBookingStore();
    await store.fetchCategories();

    expect(store.categories).toHaveLength(2);
    expect(store.categories[0].name).toBe('Medical');
  });

  it('fetchResources populates resources', async () => {
    vi.mocked(api.get).mockResolvedValue({
      resources: [
        { id: '1', name: 'Dr. Smith', resource_type: 'specialist' },
      ],
    });

    const store = useBookingStore();
    await store.fetchResources();

    expect(store.resources).toHaveLength(1);
  });

  it('fetchResources passes category filter', async () => {
    vi.mocked(api.get).mockResolvedValue({ resources: [] });

    const store = useBookingStore();
    await store.fetchResources({ category: 'medical' });

    expect(api.get).toHaveBeenCalledWith('/booking/resources?category=medical');
  });

  it('fetchResourceBySlug sets currentResource', async () => {
    const mockResource = { id: '1', name: 'Dr. Smith', slug: 'dr-smith' };
    vi.mocked(api.get).mockResolvedValue(mockResource);

    const store = useBookingStore();
    await store.fetchResourceBySlug('dr-smith');

    expect(store.currentResource?.name).toBe('Dr. Smith');
  });

  it('fetchAvailability populates availableSlots', async () => {
    vi.mocked(api.get).mockResolvedValue({
      slots: [
        { start: '09:00', end: '09:30', available_capacity: 1 },
        { start: '09:30', end: '10:00', available_capacity: 1 },
      ],
    });

    const store = useBookingStore();
    await store.fetchAvailability('dr-smith', '2026-03-20');

    expect(store.availableSlots).toHaveLength(2);
    expect(store.availableSlots[0].start).toBe('09:00');
  });

  it('checkout calls checkout API and returns invoice', async () => {
    const mockResult = { invoice_id: 'inv-1', invoice_number: 'BK-ABCD1234' };
    vi.mocked(api.post).mockResolvedValue(mockResult);

    const store = useBookingStore();
    const result = await store.checkout({
      resource_slug: 'dr-smith',
      start_at: '2026-03-20T10:00:00',
      end_at: '2026-03-20T10:30:00',
    });

    expect(api.post).toHaveBeenCalledWith('/booking/checkout', expect.objectContaining({
      resource_slug: 'dr-smith',
    }));
    expect(result.invoice_id).toBe('inv-1');
    expect(result.invoice_number).toBe('BK-ABCD1234');
  });

  it('fetchUserBookings populates userBookings', async () => {
    vi.mocked(api.get).mockResolvedValue({
      bookings: [
        { id: '1', status: 'confirmed' },
        { id: '2', status: 'completed' },
      ],
    });

    const store = useBookingStore();
    await store.fetchUserBookings();

    expect(store.userBookings).toHaveLength(2);
  });

  it('cancelBooking calls API and updates currentBooking', async () => {
    const cancelled = { id: '1', status: 'cancelled' };
    vi.mocked(api.post).mockResolvedValue(cancelled);

    const store = useBookingStore();
    const result = await store.cancelBooking('1');

    expect(api.post).toHaveBeenCalledWith('/booking/bookings/1/cancel', {});
    expect(result.status).toBe('cancelled');
    expect(store.currentBooking?.status).toBe('cancelled');
  });

  it('loading is true during fetchResources', async () => {
    let resolvePromise: (value: unknown) => void;
    vi.mocked(api.get).mockImplementation(() => new Promise(resolve => { resolvePromise = resolve; }));

    const store = useBookingStore();
    const fetchPromise = store.fetchResources();

    expect(store.loading).toBe(true);

    resolvePromise!({ resources: [] });
    await fetchPromise;

    expect(store.loading).toBe(false);
  });
});
