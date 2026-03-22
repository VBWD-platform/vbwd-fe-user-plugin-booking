<template>
  <div class="ghrm-detail">
    <div
      v-if="store.loading"
      class="ghrm-loading"
    >
      {{ $t('booking.form.loading') }}
    </div>
    <div
      v-else-if="!resource"
      class="ghrm-error"
    >
      {{ $t('booking.form.notFound') }}
    </div>

    <template v-else>
      <div class="ghrm-detail-header">
        <img
          v-if="resource.image_url"
          :src="resource.image_url"
          :alt="resource.name"
          class="ghrm-detail-icon"
        >
        <div class="ghrm-detail-meta">
          <h1 class="ghrm-detail-name">
            {{ $t('booking.form.bookTitle', { name: resource.name }) }}
          </h1>
          <p class="ghrm-detail-author">
            {{ resource.resource_type }} · {{ resource.price }} {{ resource.currency }} / {{ resource.price_unit.replace('per_', '') }}
          </p>
        </div>
      </div>

      <form
        class="booking-form"
        @submit.prevent="handleSubmit"
      >
        <!-- Date range picker (flexible duration — hotels, rentals) -->
        <template v-if="isFlexibleDuration">
          <div class="booking-form__section">
            <h3 class="ghrm-section-label">
              {{ $t('booking.form.checkIn') }}
            </h3>
            <input
              v-model="selectedDate"
              type="date"
              :min="todayString"
              class="booking-form__date"
              required
            >
          </div>
          <div class="booking-form__section">
            <h3 class="ghrm-section-label">
              {{ $t('booking.form.checkOut') }}
            </h3>
            <input
              v-model="selectedEndDate"
              type="date"
              :min="selectedDate || todayString"
              class="booking-form__date"
              required
            >
          </div>
        </template>

        <!-- Time slot picker (fixed duration — specialists, rooms, classes) -->
        <template v-else>
          <div class="booking-form__section">
            <h3 class="ghrm-section-label">
              {{ $t('booking.form.selectDate') }}
            </h3>
            <input
              v-model="selectedDate"
              type="date"
              :min="todayString"
              class="booking-form__date"
              required
              @change="loadAvailability"
            >
          </div>

          <div
            v-if="selectedDate"
            class="booking-form__section"
          >
            <h3 class="ghrm-section-label">
              {{ $t('booking.form.selectTime') }}
            </h3>
            <div
              v-if="store.availableSlots.length"
              class="booking-slots-grid"
            >
              <button
                v-for="(slot, index) in store.availableSlots"
                :key="index"
                type="button"
                class="booking-slot"
                :class="{ selected: selectedSlotIndex === index, full: slot.available_capacity === 0 }"
                :disabled="slot.available_capacity === 0"
                @click="selectedSlotIndex = index"
              >
                <span class="booking-slot__time">{{ formatSlotTime(slot) }}</span>
                <span class="booking-slot__capacity">{{ $t('booking.form.available', { count: slot.available_capacity }) }}</span>
              </button>
            </div>
            <p
              v-else
              class="ghrm-muted"
            >
              {{ $t('booking.form.noSlots') }}
            </p>
          </div>
        </template>

        <!-- Custom fields -->
        <div
          v-if="resource.custom_fields_schema && resource.custom_fields_schema.length"
          class="booking-form__section"
        >
          <h3 class="ghrm-section-label">
            {{ $t('booking.form.additionalInfo') }}
          </h3>
          <div
            v-for="field in resource.custom_fields_schema"
            :key="field.id"
            class="booking-form__field"
          >
            <label :for="`field-${field.id}`">
              {{ field.label }}
              <span
                v-if="field.required"
                class="booking-form__required"
              >*</span>
            </label>
            <input
              v-if="field.type === 'string' || field.type === 'text'"
              :id="`field-${field.id}`"
              v-model="customFields[field.id]"
              type="text"
              :required="field.required"
              class="booking-form__input"
            >
            <input
              v-else-if="field.type === 'integer'"
              :id="`field-${field.id}`"
              v-model.number="customFields[field.id]"
              type="number"
              :required="field.required"
              class="booking-form__input"
            >
            <label
              v-else-if="field.type === 'boolean'"
              class="booking-form__checkbox"
            >
              <input
                :id="`field-${field.id}`"
                v-model="customFields[field.id]"
                type="checkbox"
              >
              {{ field.label }}
            </label>
          </div>
        </div>

        <!-- Notes -->
        <div class="booking-form__section">
          <h3 class="ghrm-section-label">
            {{ $t('booking.form.notes') }}
          </h3>
          <textarea
            v-model="notes"
            class="booking-form__input"
            rows="3"
            :placeholder="$t('booking.form.notesPlaceholder')"
          />
        </div>

        <!-- Submit -->
        <div class="booking-form__actions">
          <button
            type="submit"
            class="ghrm-cta-btn"
            :disabled="!canSubmit || submitting"
          >
            {{ submitting ? $t('booking.form.booking') : $t('booking.form.confirmBooking') }}
          </button>
          <router-link
            :to="`/booking/${resourceSlug}`"
            class="booking-back-link"
          >
            {{ $t('booking.form.cancel') }}
          </router-link>
        </div>

        <p
          v-if="errorMessage"
          class="booking-form__error"
        >
          {{ errorMessage }}
        </p>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBookingStore } from '../stores/booking';

const route = useRoute();
const router = useRouter();
const store = useBookingStore();

const resourceSlug = computed(() => route.params.slug as string);
const resource = computed(() => store.currentResource);

const selectedDate = ref('');
const selectedEndDate = ref('');
const selectedSlotIndex = ref<number | null>(null);
const customFields = reactive<Record<string, unknown>>({});
const notes = ref('');
const submitting = ref(false);
const errorMessage = ref('');

const todayString = computed(() => new Date().toISOString().split('T')[0]);

const isFlexibleDuration = computed(() =>
  resource.value && resource.value.slot_duration_minutes === null
);

const selectedSlot = computed(() => {
  if (selectedSlotIndex.value === null) return null;
  return store.availableSlots[selectedSlotIndex.value] ?? null;
});

const canSubmit = computed(() => {
  if (isFlexibleDuration.value) {
    return selectedDate.value && selectedEndDate.value && selectedEndDate.value > selectedDate.value;
  }
  return selectedDate.value && selectedSlot.value && selectedSlot.value.available_capacity > 0;
});

function formatSlotTime(slot: { start?: string; end?: string; date?: string }) {
  if (slot.start && slot.end) {
    return `${slot.start.slice(11, 16)} – ${slot.end.slice(11, 16)}`;
  }
  if (slot.date) return slot.date;
  return '';
}

async function loadAvailability() {
  selectedSlotIndex.value = null;
  if (selectedDate.value && resourceSlug.value) {
    await store.fetchAvailability(resourceSlug.value, selectedDate.value);
  }
}

async function handleSubmit() {
  if (!canSubmit.value || !resource.value) return;

  let startAt: string;
  let endAt: string;

  if (isFlexibleDuration.value) {
    // Date range mode: check-in 14:00, check-out 11:00
    startAt = `${selectedDate.value}T14:00:00`;
    endAt = `${selectedEndDate.value}T11:00:00`;
  } else {
    if (!selectedSlot.value) return;
    startAt = selectedSlot.value.start!;
    endAt = selectedSlot.value.end!;
  }

  submitting.value = true;
  errorMessage.value = '';
  try {
    const booking = await store.createBooking({
      resource_slug: resourceSlug.value,
      start_at: startAt,
      end_at: endAt,
      custom_fields: { ...customFields },
      notes: notes.value || undefined,
    });

    // Redirect to booking's own checkout page with full details
    router.push({
      path: `/booking/${resourceSlug.value}/book/pay`,
      query: { booking_id: booking.id },
    });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Booking failed. Please try again.';
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  if (resourceSlug.value) {
    store.fetchResourceBySlug(resourceSlug.value);
  }
});
</script>

<style scoped>
.ghrm-detail { max-width: 1100px; margin: 0 auto; padding: 24px 20px; }
.ghrm-detail-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
.ghrm-detail-icon { width: 80px; height: 80px; object-fit: contain; border-radius: 12px; border: 1px solid #e9ecef; flex-shrink: 0; }
.ghrm-detail-meta { flex: 1; }
.ghrm-detail-name { font-size: 1.8rem; color: #2c3e50; margin: 0 0 4px; }
.ghrm-detail-author { color: #6b7280; font-size: 14px; margin: 0; text-transform: capitalize; }
.ghrm-section-label { font-size: 0.82rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin: 0 0 10px; }
.ghrm-muted { color: #9ca3af; font-style: italic; }
.ghrm-loading, .ghrm-error { text-align: center; padding: 60px 20px; color: #6b7280; }
.ghrm-error { color: #dc2626; }
.ghrm-cta-btn { display: inline-block; padding: 12px 24px; background: #3498db; color: #fff; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 15px; border: none; cursor: pointer; }
.ghrm-cta-btn:hover:not(:disabled) { background: #2980b9; }
.ghrm-cta-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.booking-form { margin-top: 8px; }
.booking-form__section { margin-bottom: 28px; }
.booking-form__date { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
.booking-form__field { margin-bottom: 12px; }
.booking-form__field label { display: block; font-size: 14px; color: #374151; margin-bottom: 4px; }
.booking-form__required { color: #dc2626; }
.booking-form__input { width: 100%; max-width: 400px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
.booking-form__checkbox { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.booking-form__actions { display: flex; align-items: center; gap: 16px; margin-top: 24px; }
.booking-form__error { color: #dc2626; margin-top: 12px; font-size: 14px; }

.booking-slots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }
.booking-slot { display: flex; flex-direction: column; gap: 2px; padding: 12px; background: #fff; border: 1px solid #e9ecef; border-radius: 6px; text-align: center; cursor: pointer; transition: border-color .2s; }
.booking-slot:hover:not(.full):not(:disabled) { border-color: #3498db; }
.booking-slot.selected { border-color: #3498db; background: #e8f4fd; }
.booking-slot.full { opacity: 0.4; cursor: not-allowed; }
.booking-slot__time { font-weight: 600; color: #2c3e50; font-size: 14px; }
.booking-slot__capacity { font-size: 12px; color: #6b7280; }

.booking-back-link { color: #6b7280; text-decoration: none; font-size: 14px; }
.booking-back-link:hover { text-decoration: underline; }
</style>
