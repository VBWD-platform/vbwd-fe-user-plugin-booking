<template>
  <div class="booking-detail">
    <header class="booking-detail__header">
      <router-link
        to="/dashboard/bookings"
        class="booking-detail__back"
      >
        ← {{ $t('booking.detail.back') }}
      </router-link>

      <div
        v-if="booking"
        class="booking-detail__heading"
      >
        <h1>{{ booking.resource?.name || $t('booking.myBookings.unknown') }}</h1>
        <span :class="`booking-status booking-status--${booking.status}`">
          {{ $t(`booking.status.${booking.status}`) }}
        </span>
      </div>
    </header>

    <div
      v-if="store.loading && !booking"
      class="booking-detail__loading"
    >
      {{ $t('booking.detail.loading') }}
    </div>

    <div
      v-else-if="!booking"
      class="booking-detail__empty"
    >
      {{ $t('booking.detail.notFound') }}
    </div>

    <section
      v-else
      class="booking-detail__body"
    >
      <dl class="booking-detail__grid">
        <div class="booking-detail__field">
          <dt>{{ $t('booking.detail.dateTime') }}</dt>
          <dd>{{ dateTimeDisplay }}</dd>
        </div>
        <div class="booking-detail__field">
          <dt>{{ $t('booking.detail.duration') }}</dt>
          <dd>{{ durationDisplay }}</dd>
        </div>
        <div
          v-if="booking.quantity && booking.quantity !== 1"
          class="booking-detail__field"
        >
          <dt>{{ $t('booking.detail.quantity') }}</dt>
          <dd>{{ booking.quantity }}</dd>
        </div>
        <div
          v-if="priceDisplay"
          class="booking-detail__field"
        >
          <dt>{{ $t('booking.detail.price') }}</dt>
          <dd>{{ priceDisplay }}</dd>
        </div>
        <div
          v-for="(value, key) in (booking.custom_fields || {})"
          :key="key"
          class="booking-detail__field"
        >
          <dt>{{ key }}</dt>
          <dd>{{ value }}</dd>
        </div>
        <div
          v-if="booking.notes"
          class="booking-detail__field"
        >
          <dt>{{ $t('booking.detail.notes') }}</dt>
          <dd>{{ booking.notes }}</dd>
        </div>
      </dl>

      <div class="booking-detail__actions">
        <button
          v-if="canModify"
          type="button"
          class="btn btn--danger-outline"
          @click="cancelModalOpen = true"
        >
          {{ $t('booking.detail.actions.cancel') }}
        </button>
        <router-link
          v-if="canModify"
          :to="`/dashboard/bookings/${booking.id}/reschedule`"
          class="btn"
        >
          {{ $t('booking.detail.actions.reschedule') }}
        </router-link>
        <button
          type="button"
          class="btn"
          @click="downloadIcal"
        >
          {{ $t('booking.detail.actions.addToCalendar') }}
        </button>
        <button
          type="button"
          class="btn"
          @click="downloadPdf"
        >
          {{ $t('booking.detail.actions.downloadPdf') }}
        </button>
        <router-link
          v-if="booking.resource"
          :to="`/booking/${booking.resource.slug}`"
          class="btn"
        >
          {{ $t('booking.detail.actions.bookAgain') }}
        </router-link>
        <router-link
          v-if="booking.invoice_id"
          :to="`/dashboard/invoice/${booking.invoice_id}`"
          class="btn"
        >
          {{ $t('booking.detail.actions.viewInvoice') }}
        </router-link>
      </div>
    </section>

    <BookingCancelModal
      ref="cancelModalRef"
      :open="cancelModalOpen"
      :resource-name="booking?.resource?.name || ''"
      :when-display="dateTimeDisplay"
      :policy-note="cancelPolicyNote"
      :loading="cancelling"
      @keep="cancelModalOpen = false"
      @confirm="confirmCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useBookingStore } from '../stores/booking';
import { downloadAuthenticatedFile } from '../utils/download';
import BookingCancelModal from '../components/BookingCancelModal.vue';

const route = useRoute();
const { t, locale } = useI18n();
const store = useBookingStore();

const cancelModalOpen = ref(false);
const cancelling = ref(false);
const cancelModalRef = ref<InstanceType<typeof BookingCancelModal> | null>(null);

const booking = computed(() => store.currentBooking);

const bookingIdFromRoute = computed(() => (route.params.id || route.params.bookingId) as string);

onMounted(async () => {
  await Promise.all([
    store.fetchConfig().catch(() => undefined),
    store.fetchBookingDetail(bookingIdFromRoute.value),
  ]);
});

watch(bookingIdFromRoute, async (newId) => {
  if (newId) await store.fetchBookingDetail(newId);
});

const dateTimeDisplay = computed(() => {
  if (!booking.value) return '';
  const start = new Date(booking.value.start_at);
  const end = new Date(booking.value.end_at);
  const date = start.toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
  const startTime = start.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${startTime} – ${endTime}`;
});

const durationDisplay = computed(() => {
  if (!booking.value) return '';
  const ms = new Date(booking.value.end_at).getTime() - new Date(booking.value.start_at).getTime();
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`;
});

const priceDisplay = computed(() => {
  const resource = booking.value?.resource;
  if (!resource?.price) return '';
  return `${resource.price} ${resource.currency}`;
});

const canModify = computed(() => store.canCancelOrReschedule(booking.value));

const cancelPolicyNote = computed(() => {
  const hours = store.config?.cancellation_grace_period_hours;
  if (!hours) return '';
  return t('booking.detail.actions.cancelPolicy', { hours });
});

async function confirmCancel() {
  if (!booking.value) return;
  cancelling.value = true;
  try {
    await store.cancelBooking(booking.value.id);
    cancelModalOpen.value = false;
  } catch (error) {
    cancelModalRef.value?.setError((error as Error).message || t('booking.detail.actions.cancelError'));
  } finally {
    cancelling.value = false;
  }
}

async function downloadIcal() {
  if (!booking.value) return;
  await downloadAuthenticatedFile(
    `/booking/bookings/${booking.value.id}/ical`,
    `booking-${booking.value.id.slice(0, 8)}.ics`,
  );
}

async function downloadPdf() {
  if (!booking.value) return;
  await downloadAuthenticatedFile(
    `/booking/bookings/${booking.value.id}/pdf`,
    `booking-${booking.value.id.slice(0, 8)}.pdf`,
  );
}
</script>

<style scoped>
.booking-detail {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}
.booking-detail__back {
  display: inline-block;
  margin-bottom: 1rem;
  color: var(--vbwd-text-muted, #4a5568);
  text-decoration: none;
  font-size: 0.9rem;
}
.booking-detail__back:hover { text-decoration: underline; }
.booking-detail__heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}
.booking-detail__heading h1 { margin: 0; font-size: 1.75rem; }

.booking-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: capitalize;
}
.booking-status--confirmed { background: #dcfce7; color: #166534; }
.booking-status--pending { background: #fef9c3; color: #854d0e; }
.booking-status--cancelled { background: #fee2e2; color: #991b1b; }
.booking-status--completed { background: #dbeafe; color: #1e40af; }

.booking-detail__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem 2rem;
  margin: 0 0 2rem;
}
.booking-detail__field { margin: 0; }
.booking-detail__field dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vbwd-text-muted, #718096);
  margin-bottom: 0.25rem;
}
.booking-detail__field dd { margin: 0; font-size: 1rem; }

.booking-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--vbwd-border, #e2e8f0);
}
.btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--vbwd-border, #cbd5e0);
  border-radius: 4px;
  background: transparent;
  color: var(--vbwd-text, #1a202c);
  cursor: pointer;
  font-size: 0.9rem;
  text-decoration: none;
  display: inline-block;
}
.btn:hover { background: var(--vbwd-surface-muted, #f7fafc); }
.btn--danger-outline {
  border-color: #e53e3e;
  color: #c53030;
}
.btn--danger-outline:hover { background: #fff5f5; }

.booking-detail__loading, .booking-detail__empty {
  padding: 3rem;
  text-align: center;
  color: var(--vbwd-text-muted, #4a5568);
}
</style>
