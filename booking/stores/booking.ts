import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api';

export interface ResourceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface BookableResource {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  resource_type: string;
  capacity: number;
  slot_duration_minutes: number | null;
  price: string;
  currency: string;
  price_unit: string;
  availability: Record<string, unknown>;
  custom_fields_schema: Array<{ id: string; label: string; type: string; required: boolean }> | null;
  image_url: string | null;
  images: Array<{ id: string; url?: string; alt?: string; is_primary: boolean; sort_order: number }>;
  categories: Array<{ id: string; name: string; slug: string }>;
}

export interface AvailableSlot {
  start?: string;
  end?: string;
  date?: string;
  available_capacity: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  id: string;
  resource_id: string;
  user_id: string;
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_company?: string;
  invoice_id: string | null;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  quantity: number;
  custom_fields: Record<string, unknown>;
  notes: string | null;
  admin_notes?: string | null;
  resource: BookableResource | null;
  created_at: string;
  updated_at?: string;
}

export interface BookingConfig {
  cancellation_grace_period_hours: number;
  min_lead_time_hours: number;
  max_advance_booking_days: number;
  default_slot_duration_minutes: number;
}

export interface BookingsPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

type BookingsListResponse = {
  bookings: Booking[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  status: 'upcoming' | 'past' | 'all';
};

const DEFAULT_PAST_PAGINATION: BookingsPagination = {
  page: 1,
  perPage: 20,
  total: 0,
  totalPages: 0,
};

export const useBookingStore = defineStore('booking', () => {
  const categories = ref<ResourceCategory[]>([]);
  const resources = ref<BookableResource[]>([]);
  const currentResource = ref<BookableResource | null>(null);
  const availableSlots = ref<AvailableSlot[]>([]);

  // Split lists per Sprint 28 Q14: upcoming is fully loaded, past is paginated.
  const upcomingBookings = ref<Booking[]>([]);
  const pastBookings = ref<Booking[]>([]);
  const pastPagination = ref<BookingsPagination>({ ...DEFAULT_PAST_PAGINATION });

  const currentBooking = ref<Booking | null>(null);
  const config = ref<BookingConfig | null>(null);
  const loading = ref(false);

  /** Holds form data between BookingForm → BookingCheckout (no API call yet). */
  const pendingCheckout = ref<{
    resource_slug: string;
    start_at: string;
    end_at: string;
    quantity?: number;
    custom_fields?: Record<string, unknown>;
    notes?: string;
  } | null>(null);

  async function fetchCategories() {
    const response = await api.get('/booking/categories') as { categories: ResourceCategory[] };
    categories.value = response.categories;
  }

  async function fetchResources(filters?: { category?: string; type?: string }) {
    loading.value = true;
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.set('category', filters.category);
      if (filters?.type) params.set('type', filters.type);
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/booking/resources${query}`) as { resources: BookableResource[] };
      resources.value = response.resources;
    } finally {
      loading.value = false;
    }
  }

  async function fetchResourceBySlug(slug: string) {
    loading.value = true;
    try {
      currentResource.value = await api.get(`/booking/resources/${slug}`) as BookableResource;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAvailability(slug: string, dateString: string) {
    const response = await api.get(`/booking/resources/${slug}/availability?date=${dateString}`) as {
      slots: AvailableSlot[];
    };
    availableSlots.value = response.slots;
  }

  async function checkout(data: {
    resource_slug: string;
    start_at: string;
    end_at: string;
    quantity?: number;
    custom_fields?: Record<string, unknown>;
    notes?: string;
  }): Promise<{ invoice_id: string; invoice_number: string }> {
    return await api.post('/booking/checkout', data) as { invoice_id: string; invoice_number: string };
  }

  /** Fetches the public booking policy config once per session. */
  async function fetchConfig(): Promise<BookingConfig> {
    if (config.value) return config.value;
    const response = await api.get('/booking/config') as BookingConfig;
    config.value = response;
    return response;
  }

  async function fetchUpcomingBookings() {
    loading.value = true;
    try {
      // Pull all upcoming bookings in one shot — typically a handful.
      const response = await api.get(
        '/booking/bookings?status=upcoming&per_page=100',
      ) as BookingsListResponse;
      upcomingBookings.value = response.bookings;
    } finally {
      loading.value = false;
    }
  }

  async function fetchPastBookings(page = 1, perPage = 20) {
    loading.value = true;
    try {
      const response = await api.get(
        `/booking/bookings?status=past&page=${page}&per_page=${perPage}`,
      ) as BookingsListResponse;
      pastBookings.value = response.bookings;
      pastPagination.value = {
        page: response.page,
        perPage: response.per_page,
        total: response.total,
        totalPages: response.total_pages,
      };
    } finally {
      loading.value = false;
    }
  }

  async function fetchBookingDetail(bookingId: string) {
    loading.value = true;
    try {
      currentBooking.value = await api.get(`/booking/bookings/${bookingId}`) as Booking;
    } finally {
      loading.value = false;
    }
  }

  async function cancelBooking(bookingId: string): Promise<Booking> {
    const response = await api.post(`/booking/bookings/${bookingId}/cancel`, {}) as Booking;

    // Optimistic local sync: the now-cancelled booking leaves upcoming and
    // joins past (at the front, since it's the most recent past event).
    upcomingBookings.value = upcomingBookings.value.filter((booking) => booking.id !== bookingId);
    pastBookings.value = [response, ...pastBookings.value.filter((booking) => booking.id !== bookingId)];
    if (currentBooking.value?.id === bookingId) {
      currentBooking.value = response;
    }
    return response;
  }

  async function rescheduleBooking(
    bookingId: string,
    newStartAt: string,
    newEndAt: string,
  ): Promise<Booking> {
    const response = await api.patch(
      `/booking/bookings/${bookingId}`,
      { start_at: newStartAt, end_at: newEndAt },
    ) as Booking;

    // Re-sort upcoming by start_at ascending after the update.
    upcomingBookings.value = upcomingBookings.value
      .map((booking) => (booking.id === bookingId ? response : booking))
      .sort((first, second) =>
        new Date(first.start_at).getTime() - new Date(second.start_at).getTime(),
      );
    if (currentBooking.value?.id === bookingId) {
      currentBooking.value = response;
    }
    return response;
  }

  const nextUpcomingBooking = computed<Booking | null>(() =>
    upcomingBookings.value.length > 0 ? upcomingBookings.value[0] : null,
  );

  const nextUpcomingBookings3 = computed<Booking[]>(() =>
    upcomingBookings.value.slice(0, 3),
  );

  /**
   * Computed over booking + config: does the user still fall inside the
   * cancellation/reschedule window for a given booking?
   */
  function canCancelOrReschedule(booking: Booking | null): boolean {
    if (!booking || !config.value) return false;
    if (booking.status !== 'pending' && booking.status !== 'confirmed') return false;
    const startMs = new Date(booking.start_at).getTime();
    const cutoffMs = startMs - config.value.cancellation_grace_period_hours * 3600_000;
    return Date.now() < cutoffMs;
  }

  return {
    // state
    categories,
    resources,
    currentResource,
    availableSlots,
    upcomingBookings,
    pastBookings,
    pastPagination,
    currentBooking,
    config,
    pendingCheckout,
    loading,
    // actions
    fetchCategories,
    fetchResources,
    fetchResourceBySlug,
    fetchAvailability,
    checkout,
    fetchConfig,
    fetchUpcomingBookings,
    fetchPastBookings,
    fetchBookingDetail,
    cancelBooking,
    rescheduleBooking,
    // getters
    nextUpcomingBooking,
    nextUpcomingBookings3,
    canCancelOrReschedule,
  };
});
