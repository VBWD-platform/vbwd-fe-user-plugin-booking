import { defineStore } from 'pinia';
import { ref } from 'vue';
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
  categories: Array<{ id: string; name: string; slug: string }>;
}

export interface AvailableSlot {
  start?: string;
  end?: string;
  date?: string;
  available_capacity: number;
}

export interface Booking {
  id: string;
  resource_id: string;
  user_id: string;
  invoice_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
  quantity: number;
  custom_fields: Record<string, unknown>;
  notes: string | null;
  resource: BookableResource | null;
  created_at: string;
}

export const useBookingStore = defineStore('booking', () => {
  const categories = ref<ResourceCategory[]>([]);
  const resources = ref<BookableResource[]>([]);
  const currentResource = ref<BookableResource | null>(null);
  const availableSlots = ref<AvailableSlot[]>([]);
  const userBookings = ref<Booking[]>([]);
  const currentBooking = ref<Booking | null>(null);
  const loading = ref(false);

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

  async function createBooking(data: {
    resource_slug: string;
    start_at: string;
    end_at: string;
    quantity?: number;
    custom_fields?: Record<string, unknown>;
    notes?: string;
  }): Promise<Booking> {
    const response = await api.post('/booking/bookings', data) as Booking;
    return response;
  }

  async function fetchUserBookings() {
    loading.value = true;
    try {
      const response = await api.get('/booking/bookings') as { bookings: Booking[] };
      userBookings.value = response.bookings;
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

  async function cancelBooking(bookingId: string) {
    const response = await api.post(`/booking/bookings/${bookingId}/cancel`, {}) as Booking;
    currentBooking.value = response;
    return response;
  }

  return {
    categories,
    resources,
    currentResource,
    availableSlots,
    userBookings,
    currentBooking,
    loading,
    fetchCategories,
    fetchResources,
    fetchResourceBySlug,
    fetchAvailability,
    createBooking,
    fetchUserBookings,
    fetchBookingDetail,
    cancelBooking,
  };
});
