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
        <router-link
          :to="`/booking/${resource.slug}`"
          class="resource-name-link"
        >
          <h3>{{ resource.name }}</h3>
        </router-link>
        <p
          v-if="resource.description"
          class="resource-description"
        >
          {{ resource.description }}
        </p>
      </div>
    </div>

    <div class="booking-price-info">
      <span class="booking-price">{{ resource.price }} {{ resource.currency }}/{{ resource.price_unit }}</span>
    </div>

    <h3>{{ $t('booking.confirmation.bookingDetails') }}</h3>
    <div class="booking-details-grid">
      <div class="detail-row">
        <span class="detail-label">{{ $t('booking.checkout.dateTime') }}</span>
        <span class="detail-value">{{ formatDateTime(String(bookingData.start_at || '')) }} — {{ formatDateTime(String(bookingData.end_at || '')) }}</span>
      </div>
      <div
        v-if="bookingData.quantity"
        class="detail-row"
      >
        <span class="detail-label">{{ $t('booking.checkout.quantity') }}</span>
        <span class="detail-value">{{ bookingData.quantity }}</span>
      </div>
    </div>

    <!-- Custom Fields -->
    <div
      v-if="bookingData.custom_fields && Object.keys(bookingData.custom_fields as object).length > 0"
      class="booking-custom-fields"
    >
      <h3 class="section-label">
        {{ $t('booking.checkout.additionalInfo') }}
      </h3>
      <div
        v-for="(value, key) in (bookingData.custom_fields as Record<string, unknown>)"
        :key="String(key)"
        class="detail-row"
      >
        <span class="detail-label">{{ key }}</span>
        <span class="detail-value">{{ value }}</span>
      </div>
    </div>

    <!-- Notes -->
    <div
      v-if="bookingData.notes"
      class="booking-notes"
    >
      <h3 class="section-label">
        {{ $t('booking.checkout.notes') }}
      </h3>
      <p>{{ bookingData.notes }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

interface BookingResource {
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  price: string;
  currency: string;
  price_unit: string;
  resource_type?: string;
}

interface BookingData {
  id?: string;
  start_at?: string;
  end_at?: string;
  quantity?: number;
  custom_fields?: Record<string, unknown>;
  notes?: string | null;
}

const props = defineProps<{
  invoiceId: string;
  invoiceData: Record<string, unknown> | null;
}>();

const router = useRouter();
const bookingData = ref<BookingData | null>(null);
const resource = ref<BookingResource | null>(null);

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

onMounted(async () => {
  if (!props.invoiceData) return;

  const lineItems = (props.invoiceData.line_items || []) as Array<Record<string, unknown>>;
  const bookingLineItem = lineItems.find(
    (item) => (item.metadata as Record<string, unknown>)?.plugin === 'booking'
  );

  if (!bookingLineItem) return;

  // Redirect to dedicated booking success page
  router.replace({ path: '/booking/success', query: { invoice_id: props.invoiceId } });
});
</script>

<style scoped>
.booking-resource-block {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.booking-resource-image {
  width: 120px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
}
.resource-name-link {
  text-decoration: none;
  color: inherit;
}
.resource-name-link:hover h3 {
  color: var(--vbwd-color-primary, #3498db);
}
.booking-price-info {
  margin-bottom: 16px;
}
.booking-price {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--vbwd-color-primary, #3498db);
}
.booking-details-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--vbwd-border-light, #eee);
}
.detail-label {
  color: var(--vbwd-text-muted, #666);
  font-size: 0.9rem;
}
.detail-value {
  font-weight: 500;
}
.section-label {
  font-size: 0.95rem;
  margin-bottom: 8px;
}
</style>
