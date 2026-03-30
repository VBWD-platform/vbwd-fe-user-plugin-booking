<template>
  <div class="booking-success">
    <!-- Loading -->
    <div
      v-if="loading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('booking.success.verifying') }}</p>
    </div>

    <template v-else>
      <!-- Status Banner -->
      <div
        class="confirmation-banner"
        :class="`confirmation-banner--${invoiceStatus}`"
      >
        <h1 v-if="invoiceStatus === 'paid'">
          {{ $t('booking.success.titlePaid') }}
        </h1>
        <h1 v-else-if="invoiceStatus === 'authorized'">
          {{ $t('booking.success.titleAuthorized') }}
        </h1>
        <h1 v-else>
          {{ $t('booking.success.titlePending') }}
        </h1>
        <p v-if="invoiceStatus === 'paid'">
          {{ $t('booking.success.messagePaid') }}
        </p>
        <p v-else>
          {{ $t('booking.success.messagePending') }}
        </p>
      </div>

      <!-- Invoice Details -->
      <div
        v-if="invoice"
        class="card"
      >
        <h2>{{ $t('booking.success.invoiceDetails') }}</h2>
        <div class="confirmation-grid">
          <div
            v-if="invoice.invoice_number"
            class="confirmation-row"
          >
            <span class="confirmation-label">{{ $t('booking.success.invoiceNumber') }}</span>
            <span class="confirmation-value confirmation-mono">{{ invoice.invoice_number }}</span>
          </div>
          <div class="confirmation-row">
            <span class="confirmation-label">{{ $t('booking.success.status') }}</span>
            <span class="confirmation-value">
              <span
                class="status-badge"
                :class="invoiceStatus"
              >{{ invoiceStatus }}</span>
            </span>
          </div>
          <div
            v-if="invoice.amount"
            class="confirmation-row"
          >
            <span class="confirmation-label">{{ $t('booking.success.amount') }}</span>
            <span class="confirmation-value"><strong>{{ invoice.amount }} {{ invoice.currency }}</strong></span>
          </div>
          <div
            v-if="invoice.paid_at"
            class="confirmation-row"
          >
            <span class="confirmation-label">{{ $t('booking.success.paidAt') }}</span>
            <span class="confirmation-value">{{ formatDate(invoice.paid_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Booking Details (from line items) -->
      <div
        v-if="bookingResource"
        class="card"
      >
        <h2>{{ $t('booking.success.bookingDetails') }}</h2>
        <div class="booking-resource-block">
          <img
            v-if="bookingResource.image_url"
            :src="bookingResource.image_url"
            :alt="bookingResource.name"
            class="booking-resource-image"
          >
          <div class="booking-resource-info">
            <router-link
              :to="`/booking/${bookingResource.slug}`"
              class="booking-resource-name"
            >
              {{ bookingResource.name }}
            </router-link>
            <p class="resource-type">
              {{ bookingResource.resource_type }}
            </p>
            <p
              v-if="bookingResource.description"
              class="resource-desc"
            >
              {{ bookingResource.description }}
            </p>
          </div>
        </div>

        <div class="confirmation-grid">
          <div
            v-if="bookingMeta.start_at"
            class="confirmation-row"
          >
            <span class="confirmation-label">{{ $t('booking.checkout.dateTime') }}</span>
            <span class="confirmation-value">{{ formatDate(bookingMeta.start_at) }} — {{ formatDate(bookingMeta.end_at) }}</span>
          </div>
          <div
            v-for="(value, key) in (bookingMeta.custom_fields || {})"
            :key="String(key)"
            class="confirmation-row"
          >
            <span class="confirmation-label">{{ key }}</span>
            <span class="confirmation-value">{{ value }}</span>
          </div>
          <div
            v-if="bookingMeta.notes"
            class="confirmation-row"
          >
            <span class="confirmation-label">{{ $t('booking.checkout.notes') }}</span>
            <span class="confirmation-value">{{ bookingMeta.notes }}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="checkout-actions">
        <router-link
          to="/booking"
          class="btn secondary"
        >
          {{ $t('booking.detail.backToCatalogue') }}
        </router-link>
        <router-link
          to="/dashboard/bookings"
          class="btn primary"
        >
          {{ $t('booking.success.viewBookings') }}
        </router-link>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '@/api';

const route = useRoute();
const loading = ref(true);
const invoice = ref<Record<string, unknown> | null>(null);
const bookingResource = ref<{
  name: string; slug: string; description?: string; image_url?: string;
  resource_type?: string; price?: string; currency?: string;
} | null>(null);
const bookingMeta = ref<Record<string, unknown>>({});

const invoiceId = computed(() => route.query.invoice_id as string || route.query.invoice as string || '');
const invoiceStatus = computed(() => ((invoice.value?.status as string) || 'pending').toLowerCase());

function formatDate(dateString: unknown): string {
  if (!dateString || typeof dateString !== 'string') return '';
  return new Date(dateString).toLocaleString();
}

onMounted(async () => {
  try {
    if (!invoiceId.value) return;

    // Fetch invoice
    const response = await api.get(`/user/invoices/${invoiceId.value}`) as Record<string, unknown>;
    invoice.value = (response.invoice as Record<string, unknown>) || response;

    // Find booking line item
    const lineItems = (invoice.value.line_items as Array<Record<string, unknown>>) || [];
    const bookingLineItem = lineItems.find(item => {
      const extraData = item.extra_data as Record<string, unknown> | undefined;
      return extraData?.plugin === 'booking';
    });

    if (bookingLineItem) {
      const extraData = bookingLineItem.extra_data as Record<string, unknown>;
      bookingMeta.value = extraData;

      // Fetch resource details
      const resourceSlug = extraData.resource_slug as string;
      if (resourceSlug) {
        try {
          bookingResource.value = await api.get(`/booking/resources/${resourceSlug}`) as typeof bookingResource.value;
        } catch {
          bookingResource.value = {
            name: extraData.resource_name as string,
            slug: resourceSlug,
            resource_type: extraData.resource_type as string,
          };
        }
      }
    }
  } catch {
    // Invoice not accessible yet
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.booking-success { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
.loading-state { text-align: center; padding: 60px 20px; color: #666; }
.spinner { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.confirmation-banner { padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 24px; }
.confirmation-banner h1 { margin: 0 0 8px; font-size: 1.6rem; }
.confirmation-banner p { margin: 0; font-size: 1rem; }
.confirmation-banner--paid, .confirmation-banner--authorized { background: #dcfce7; color: #166534; }
.confirmation-banner--pending { background: #fef9c3; color: #854d0e; }

.card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05); margin-bottom: 20px; }
.card h2 { margin-bottom: 20px; color: #2c3e50; font-size: 1.2rem; border-bottom: 1px solid #eee; padding-bottom: 10px; }

.confirmation-grid { display: flex; flex-direction: column; }
.confirmation-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f8f9fa; }
.confirmation-label { color: #6b7280; font-weight: 500; font-size: 0.95rem; }
.confirmation-value { color: #2c3e50; font-size: 0.95rem; }
.confirmation-mono { font-family: monospace; font-size: 0.85rem; color: #6b7280; }

.status-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 500; text-transform: capitalize; }
.status-badge.paid, .status-badge.authorized { background: #dcfce7; color: #166534; }
.status-badge.pending { background: #fef9c3; color: #854d0e; }

.booking-resource-block { display: flex; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
.booking-resource-image { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.booking-resource-info { flex: 1; }
.booking-resource-name { font-weight: 600; color: #3498db; text-decoration: none; font-size: 1.1rem; }
.booking-resource-name:hover { text-decoration: underline; }
.resource-type { color: #6b7280; font-size: 0.9rem; margin: 4px 0; text-transform: capitalize; }
.resource-desc { color: #4b5563; font-size: 0.9rem; margin: 4px 0; }

.checkout-actions { display: flex; justify-content: space-between; align-items: center; gap: 15px; padding-top: 10px; }
.btn { padding: 12px 24px; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; text-decoration: none; display: inline-block; }
.btn.primary { background-color: #3498db; color: white; }
.btn.primary:hover { background-color: #2980b9; }
.btn.secondary { background-color: #ecf0f1; color: #2c3e50; }
.btn.secondary:hover { background-color: #bdc3c7; }

@media (max-width: 600px) {
  .checkout-actions { flex-direction: column; }
  .btn { width: 100%; text-align: center; }
  .confirmation-row { flex-direction: column; gap: 4px; }
  .booking-resource-block { flex-direction: column; }
}
</style>
