<template>
  <div class="booking-reschedule">
    <router-link
      :to="`/dashboard/bookings/${bookingId}`"
      class="booking-reschedule__back"
    >
      ← {{ $t('booking.reschedule.back') }}
    </router-link>

    <h1>{{ $t('booking.reschedule.title') }}</h1>

    <div
      v-if="!booking"
      class="booking-reschedule__loading"
    >
      {{ $t('booking.detail.loading') }}
    </div>

    <section
      v-else
      class="booking-reschedule__body"
    >
      <div class="booking-reschedule__current">
        <h3>{{ $t('booking.reschedule.current') }}</h3>
        <p class="booking-reschedule__current-line">
          <strong>{{ booking.resource?.name }}</strong>
          · {{ currentWhenDisplay }}
        </p>
      </div>

      <div class="booking-reschedule__picker">
        <label class="booking-reschedule__date-label">
          {{ $t('booking.reschedule.pickDate') }}
          <input
            v-model="dateString"
            type="date"
            :min="minDateString"
            :max="maxDateString"
            @change="onDateChange"
          >
        </label>

        <div
          v-if="loadingSlots"
          class="booking-reschedule__slots-loading"
        >
          {{ $t('booking.reschedule.loadingSlots') }}
        </div>

        <div
          v-else-if="slots.length === 0 && dateString"
          class="booking-reschedule__slots-empty"
        >
          {{ $t('booking.reschedule.noSlots') }}
        </div>

        <div
          v-else-if="slots.length"
          class="booking-reschedule__slots"
        >
          <button
            v-for="(slot, index) in slots"
            :key="index"
            type="button"
            class="booking-reschedule__slot"
            :class="{
              'booking-reschedule__slot--selected': selectedSlotIndex === index,
              'booking-reschedule__slot--full': slot.available_capacity === 0,
            }"
            :disabled="slot.available_capacity === 0"
            @click="selectedSlotIndex = index"
          >
            {{ formatSlotLabel(slot) }}
          </button>
        </div>
      </div>

      <p
        v-if="selectedSlot"
        class="booking-reschedule__new"
      >
        {{ $t('booking.reschedule.newTime', {
          when: formatNewWhenDisplay()
        }) }}
      </p>

      <p
        v-if="error"
        class="booking-reschedule__error"
      >
        {{ error }}
      </p>

      <div class="booking-reschedule__actions">
        <router-link
          :to="`/dashboard/bookings/${bookingId}`"
          class="btn"
        >
          {{ $t('booking.reschedule.cancel') }}
        </router-link>
        <button
          type="button"
          class="btn btn--primary"
          :disabled="!canSubmit || submitting"
          @click="submit"
        >
          {{ submitting
            ? $t('booking.reschedule.submitting')
            : $t('booking.reschedule.confirm') }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useBookingStore, type AvailableSlot } from '../stores/booking';

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const store = useBookingStore();

const bookingId = computed(() => (route.params.id || route.params.bookingId) as string);
const booking = computed(() => store.currentBooking);

const dateString = ref('');
const loadingSlots = ref(false);
const selectedSlotIndex = ref<number | null>(null);
const submitting = ref(false);
const error = ref('');

const slots = computed(() => store.availableSlots);
const selectedSlot = computed(() =>
  selectedSlotIndex.value !== null ? slots.value[selectedSlotIndex.value] : null,
);

const minDateString = computed(() => {
  const minDate = new Date(Date.now() + (store.config?.min_lead_time_hours ?? 1) * 3600_000);
  return minDate.toISOString().slice(0, 10);
});

const maxDateString = computed(() => {
  const days = store.config?.max_advance_booking_days ?? 90;
  const maxDate = new Date(Date.now() + days * 24 * 3600_000);
  return maxDate.toISOString().slice(0, 10);
});

const canSubmit = computed(() => !!selectedSlot.value && !!booking.value);

const currentWhenDisplay = computed(() => {
  if (!booking.value) return '';
  const start = new Date(booking.value.start_at);
  return start.toLocaleString(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
});

onMounted(async () => {
  await Promise.all([
    store.fetchConfig().catch(() => undefined),
    store.fetchBookingDetail(bookingId.value),
  ]);
});

async function onDateChange() {
  selectedSlotIndex.value = null;
  if (!dateString.value || !booking.value?.resource?.slug) return;
  loadingSlots.value = true;
  try {
    await store.fetchAvailability(booking.value.resource.slug, dateString.value);
  } finally {
    loadingSlots.value = false;
  }
}

function formatSlotLabel(slot: AvailableSlot) {
  if (slot.start && slot.end) {
    const startTime = slot.start.includes('T') ? slot.start.slice(11, 16) : slot.start;
    const endTime = slot.end.includes('T') ? slot.end.slice(11, 16) : slot.end;
    return `${startTime} – ${endTime}`;
  }
  return slot.date ?? '';
}

function buildIsoTimes(): { startIso: string; endIso: string } | null {
  if (!selectedSlot.value || !dateString.value) return null;
  const slot = selectedSlot.value;
  if (slot.start && slot.start.includes('T')) {
    return { startIso: slot.start, endIso: slot.end! };
  }
  if (slot.start && slot.end) {
    return {
      startIso: `${dateString.value}T${slot.start}:00`,
      endIso: `${dateString.value}T${slot.end}:00`,
    };
  }
  return null;
}

function formatNewWhenDisplay(): string {
  const iso = buildIsoTimes();
  if (!iso) return '';
  return new Date(iso.startIso).toLocaleString(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

async function submit() {
  if (!booking.value) return;
  const iso = buildIsoTimes();
  if (!iso) return;
  submitting.value = true;
  error.value = '';
  try {
    await store.rescheduleBooking(booking.value.id, iso.startIso, iso.endIso);
    router.push(`/dashboard/bookings/${booking.value.id}`);
  } catch (caught) {
    error.value = (caught as Error).message || t('booking.reschedule.errorGeneric');
    // Refresh availability so the user sees current state if the slot was just taken.
    if (dateString.value && booking.value?.resource?.slug) {
      await store.fetchAvailability(booking.value.resource.slug, dateString.value);
      selectedSlotIndex.value = null;
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.booking-reschedule {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem;
}
.booking-reschedule__back {
  display: inline-block;
  margin-bottom: 1rem;
  color: var(--vbwd-text-muted, #4a5568);
  text-decoration: none;
  font-size: 0.9rem;
}
.booking-reschedule h1 { margin: 0 0 1.5rem; font-size: 1.5rem; }

.booking-reschedule__current {
  padding: 1rem 1.25rem;
  background: var(--vbwd-surface-muted, #f7fafc);
  border-radius: 6px;
  margin-bottom: 1.5rem;
}
.booking-reschedule__current h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.25rem;
  color: var(--vbwd-text-muted, #4a5568);
}
.booking-reschedule__current-line { margin: 0; }

.booking-reschedule__date-label {
  display: block;
  margin-bottom: 1rem;
  font-weight: 500;
}
.booking-reschedule__date-label input {
  display: block;
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vbwd-border, #cbd5e0);
  border-radius: 4px;
  font-size: 0.95rem;
}
.booking-reschedule__slots-loading, .booking-reschedule__slots-empty {
  padding: 1rem;
  text-align: center;
  color: var(--vbwd-text-muted, #718096);
  background: var(--vbwd-surface-muted, #f7fafc);
  border-radius: 6px;
}
.booking-reschedule__slots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.5rem;
  margin: 1rem 0;
}
.booking-reschedule__slot {
  padding: 0.5rem;
  border: 1px solid var(--vbwd-border, #cbd5e0);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
}
.booking-reschedule__slot:hover:not(:disabled) {
  border-color: var(--vbwd-accent, #3498db);
}
.booking-reschedule__slot--selected {
  background: var(--vbwd-accent, #3498db);
  color: #ffffff;
  border-color: var(--vbwd-accent, #3498db);
}
.booking-reschedule__slot--full {
  opacity: 0.4;
  cursor: not-allowed;
}
.booking-reschedule__new {
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  background: #dcfce7;
  color: #166534;
  border-radius: 4px;
}
.booking-reschedule__error {
  margin: 1rem 0 0;
  padding: 0.75rem 1rem;
  background: #fed7d7;
  color: #742a2a;
  border-radius: 4px;
}
.booking-reschedule__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--vbwd-border, #e2e8f0);
}
.btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--vbwd-border, #cbd5e0);
  border-radius: 4px;
  background: transparent;
  color: var(--vbwd-text, #1a202c);
  cursor: pointer;
  font-size: 0.95rem;
  text-decoration: none;
  display: inline-block;
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn--primary {
  background: var(--vbwd-accent, #3498db);
  border-color: var(--vbwd-accent, #3498db);
  color: #ffffff;
}
.btn--primary:hover:not(:disabled) { background: #2980b9; border-color: #2980b9; }
</style>
