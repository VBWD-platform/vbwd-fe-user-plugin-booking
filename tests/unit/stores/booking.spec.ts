import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBookingStore } from '../../../booking/stores/booking';

vi.mock('@/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '@/api';

describe('useBookingStore — catalogue / checkout flows', () => {
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
      resources: [{ id: '1', name: 'Dr. Smith', resource_type: 'specialist' }],
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

    expect(api.post).toHaveBeenCalledWith(
      '/booking/checkout',
      expect.objectContaining({ resource_slug: 'dr-smith' }),
    );
    expect(result.invoice_id).toBe('inv-1');
  });
});

describe('useBookingStore — dashboard list flows (Sprint 28 D1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetchConfig populates + caches config, only calls api once', async () => {
    vi.mocked(api.get).mockResolvedValue({
      cancellation_grace_period_hours: 12,
      min_lead_time_hours: 1,
      max_advance_booking_days: 60,
      default_slot_duration_minutes: 30,
    });

    const store = useBookingStore();
    const first = await store.fetchConfig();
    const second = await store.fetchConfig();

    expect(first.cancellation_grace_period_hours).toBe(12);
    expect(second).toEqual(first);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/booking/config');
  });

  it('fetchUpcomingBookings populates upcoming list with per_page=100', async () => {
    vi.mocked(api.get).mockResolvedValue({
      bookings: [
        { id: 'b1', status: 'confirmed', start_at: '2026-05-01T10:00:00' },
        { id: 'b2', status: 'pending', start_at: '2026-05-02T10:00:00' },
      ],
      page: 1,
      per_page: 100,
      total: 2,
      total_pages: 1,
      status: 'upcoming',
    });

    const store = useBookingStore();
    await store.fetchUpcomingBookings();

    expect(api.get).toHaveBeenCalledWith('/booking/bookings?status=upcoming&per_page=100');
    expect(store.upcomingBookings).toHaveLength(2);
  });

  it('fetchPastBookings populates past list + pagination meta', async () => {
    vi.mocked(api.get).mockResolvedValue({
      bookings: [{ id: 'p1', status: 'completed', start_at: '2025-12-01T10:00:00' }],
      page: 2,
      per_page: 20,
      total: 42,
      total_pages: 3,
      status: 'past',
    });

    const store = useBookingStore();
    await store.fetchPastBookings(2, 20);

    expect(api.get).toHaveBeenCalledWith('/booking/bookings?status=past&page=2&per_page=20');
    expect(store.pastBookings).toHaveLength(1);
    expect(store.pastPagination).toEqual({
      page: 2,
      perPage: 20,
      total: 42,
      totalPages: 3,
    });
  });

  it('cancelBooking moves booking from upcoming to past', async () => {
    const store = useBookingStore();
    store.upcomingBookings = [
      { id: 'b1', status: 'confirmed' } as never,
      { id: 'b2', status: 'pending' } as never,
    ];
    store.pastBookings = [];

    vi.mocked(api.post).mockResolvedValue({ id: 'b1', status: 'cancelled' });

    await store.cancelBooking('b1');

    expect(store.upcomingBookings.map((b) => b.id)).toEqual(['b2']);
    expect(store.pastBookings[0].id).toBe('b1');
    expect(store.pastBookings[0].status).toBe('cancelled');
  });

  it('rescheduleBooking updates the booking in upcoming and re-sorts', async () => {
    const store = useBookingStore();
    store.upcomingBookings = [
      { id: 'b1', status: 'confirmed', start_at: '2026-05-01T10:00:00' } as never,
      { id: 'b2', status: 'confirmed', start_at: '2026-05-05T10:00:00' } as never,
    ];

    vi.mocked(api.patch).mockResolvedValue({
      id: 'b1',
      status: 'confirmed',
      start_at: '2026-05-10T10:00:00',
    });

    await store.rescheduleBooking('b1', '2026-05-10T10:00:00', '2026-05-10T11:00:00');

    expect(api.patch).toHaveBeenCalledWith(
      '/booking/bookings/b1',
      { start_at: '2026-05-10T10:00:00', end_at: '2026-05-10T11:00:00' },
    );
    // After reschedule b1 moves to 2026-05-10, so b2 (2026-05-05) is now first.
    expect(store.upcomingBookings[0].id).toBe('b2');
    expect(store.upcomingBookings[1].id).toBe('b1');
  });

  it('nextUpcomingBooking returns the first upcoming entry, null when empty', () => {
    const store = useBookingStore();
    expect(store.nextUpcomingBooking).toBeNull();

    store.upcomingBookings = [
      { id: 'b1', start_at: '2026-05-01T10:00:00' } as never,
      { id: 'b2', start_at: '2026-05-02T10:00:00' } as never,
    ];
    expect(store.nextUpcomingBooking?.id).toBe('b1');
  });

  it('nextUpcomingBookings3 caps at three', () => {
    const store = useBookingStore();
    store.upcomingBookings = [
      { id: 'b1' } as never,
      { id: 'b2' } as never,
      { id: 'b3' } as never,
      { id: 'b4' } as never,
    ];
    expect(store.nextUpcomingBookings3.map((b) => b.id)).toEqual(['b1', 'b2', 'b3']);
  });

  it('canCancelOrReschedule respects status + config grace period', () => {
    const store = useBookingStore();
    store.config = {
      cancellation_grace_period_hours: 24,
      min_lead_time_hours: 1,
      max_advance_booking_days: 90,
      default_slot_duration_minutes: 60,
    };

    const farFuture = new Date(Date.now() + 48 * 3600_000).toISOString();
    const soon = new Date(Date.now() + 10 * 3600_000).toISOString();

    expect(store.canCancelOrReschedule({ id: 'x', status: 'confirmed', start_at: farFuture } as never)).toBe(true);
    expect(store.canCancelOrReschedule({ id: 'x', status: 'confirmed', start_at: soon } as never)).toBe(false);
    expect(store.canCancelOrReschedule({ id: 'x', status: 'cancelled', start_at: farFuture } as never)).toBe(false);
    expect(store.canCancelOrReschedule({ id: 'x', status: 'completed', start_at: farFuture } as never)).toBe(false);
    expect(store.canCancelOrReschedule(null)).toBe(false);
  });
});
