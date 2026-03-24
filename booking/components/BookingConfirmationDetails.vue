<template>
  <div v-if="bookingData && resource">
    <h2>{{ $t('booking.confirmation.resourceDetails') }}</h2>

    <!-- Resource info -->
    <div class="booking-resource-block">
      <img
        v-if="resource.image_url"
        :src="resource.image_url"
        :alt="resource.name"
        class="booking-resource-image"
      >
      <div class="booking-resource-info">
        <router-link :to="`/booking/${resource.slug}`" class="booking-resource-name">
          {{ resource.name }}
        </router-link>
        <p class="resource-type">{{ resource.resource_type }}</p>
        <p v-if="resource.description" class="resource-desc">{{ resource.description }}</p>
        <div class="resource-price-row">
          <span>{{ resource.price }} {{ resource.currency }} / {{ resource.price_unit.replace('per_', '') }}</span>
        </div>
      </div>
    </div>

    <!-- Booking details -->
    <div class="booking-details">
      <div class="detail-row">
        <span class="detail-label">{{ $t('booking.checkout.dateTime') }}</span>
        <span>{{ formatDateTime(bookingData.start_at) }} — {{ formatDateTime(bookingData.end_at) }}</span>
      </div>
      <div v-if="bookingData.quantity > 1" class="detail-row">
        <span class="detail-label">{{ $t('booking.checkout.quantity') }}</span>
        <span>{{ bookingData.quantity }}</span>
      </div>
    </div>

    <!-- Custom fields -->
    <div v-if="bookingData.custom_fields && Object.keys(bookingData.custom_fields).length" class="booking-details" style="margin-top: 16px;">
      <h3 class="section-label">{{ $t('booking.confirmation.bookingInfo') }}</h3>
      <div
        v-for="(value, key) in bookingData.custom_fields"
        :key="String(key)"
        class="detail-row"
      >
        <span class="detail-label">{{ key }}</span>
        <span>{{ value }}</span>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="bookingData.notes" class="booking-notes">
      <h3 class="section-label">{{ $t('booking.checkout.notes') }}</h3>
      <p>{{ bookingData.notes }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/api';

const props = defineProps<{
  invoiceId: string;
  invoiceData: Record<string, unknown> | null;
}>();

const router = useRouter();
const bookingData = ref<Record<string, unknown> | null>(null);
const resource = ref<Record<string, unknown> | null>(null);

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

onMounted(async () => {
  if (!props.invoiceData) return;

  // Check if this invoice has booking line items
  const lineItems = (props.invoiceData.line_items as Array<Record<string, unknown>>) || [];
  const bookingLineItem = lineItems.find(item => {
    const extraData = item.extra_data as Record<string, unknown> | undefined;
    return extraData?.plugin === 'booking';
  });

  if (!bookingLineItem) return;

  // Redirect to dedicated booking success page
  router.replace({ path: '/booking/success', query: { invoice_id: props.invoiceId } });
  return;

  const extraData = bookingLineItem.extra_data as Record<string, unknown>;
  const bookingId = extraData.booking_id as string;
  const resourceSlug = extraData.resource_slug as string;

  if (bookingId) {
    try {
      const response = await api.get(`/booking/bookings/${bookingId}`) as Record<string, unknown>;
      bookingData.value = response;
    } catch {
      // Booking detail not accessible — show what we have from extra_data
      bookingData.value = {
        id: bookingId,
        start_at: extraData.start_at as string,
        end_at: extraData.end_at as string,
        custom_fields: extraData.custom_fields as Record<string, unknown>,
        quantity: 1,
        notes: null,
      };
    }
  }

  if (resourceSlug) {
    try {
      const response = await api.get(`/booking/resources/${resourceSlug}`) as Record<string, unknown>;
      resource.value = response;
    } catch {
      // Show minimal info from extra_data
      resource.value = {
        name: extraData.resource_name as string,
        slug: resourceSlug,
        resource_type: extraData.resource_type as string,
        price: '',
        currency: '',
        price_unit: '',
      };
    }
  }
});
</script>

<style scoped>
.booking-resource-block { display: flex; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
.booking-resource-image { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.booking-resource-info { flex: 1; }
.booking-resource-name { font-weight: 600; color: #3498db; text-decoration: none; font-size: 1.1rem; }
.booking-resource-name:hover { text-decoration: underline; }
.resource-type { color: #6b7280; font-size: 0.9rem; margin: 4px 0; text-transform: capitalize; }
.resource-desc { color: #4b5563; font-size: 0.9rem; margin: 4px 0; line-height: 1.5; }
.resource-price-row { margin-top: 8px; font-weight: 600; color: #3498db; }

.booking-details { }
.detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8f9fa; font-size: 0.95rem; }
.detail-label { color: #6b7280; font-weight: 500; }
.section-label { font-size: 0.85rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; margin: 0 0 10px; }
.booking-notes { margin-top: 16px; }
.booking-notes p { color: #4b5563; font-size: 0.95rem; }

@media (max-width: 600px) {
  .booking-resource-block { flex-direction: column; }
  .detail-row { flex-direction: column; gap: 4px; }
}
</style>
