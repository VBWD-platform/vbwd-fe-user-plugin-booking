<template>
  <div class="ghrm-detail">
    <div v-if="store.loading" class="ghrm-loading">
      {{ $t('booking.form.loading') }}
    </div>
    <div v-else-if="!resource" class="ghrm-error">
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
          <h1 class="ghrm-detail-name">{{ $t('booking.form.bookTitle', { name: resource.name }) }}</h1>
          <p class="ghrm-detail-author">
            {{ resource.resource_type }} · {{ resource.price }} {{ resource.currency }} / {{ resource.price_unit.replace('per_', '') }}
          </p>
        </div>
      </div>

      <!-- Selected slot summary (read-only) -->
      <div class="booking-slot-summary">
        <div class="booking-slot-summary__row">
          <span class="booking-slot-summary__label">{{ $t('booking.checkout.dateTime') }}</span>
          <span>{{ displayDateTime }}</span>
        </div>
      </div>

      <form class="booking-form" @submit.prevent="handleSubmit">
        <!-- Custom fields -->
        <div
          v-if="resource.custom_fields_schema && resource.custom_fields_schema.length"
          class="booking-form__section"
        >
          <h3 class="ghrm-section-label">{{ $t('booking.form.additionalInfo') }}</h3>
          <div
            v-for="field in resource.custom_fields_schema"
            :key="field.id"
            class="booking-form__field"
          >
            <label :for="`field-${field.id}`">
              {{ field.label }}
              <span v-if="field.required" class="booking-form__required">*</span>
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
              <input :id="`field-${field.id}`" v-model="customFields[field.id]" type="checkbox" >
              {{ field.label }}
            </label>
          </div>
        </div>

        <!-- Notes -->
        <div class="booking-form__section">
          <h3 class="ghrm-section-label">{{ $t('booking.form.notes') }}</h3>
          <textarea
            v-model="notes"
            class="booking-form__input"
            rows="3"
            :placeholder="$t('booking.form.notesPlaceholder')"
          />
        </div>

        <!-- Submit -->
        <div class="booking-form__actions">
          <button type="submit" class="ghrm-cta-btn">
            {{ $t('booking.form.confirmBooking') }}
          </button>
          <a href="#" class="booking-back-link" @click.prevent="router.back()">
            {{ $t('booking.form.cancel') }}
          </a>
        </div>
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

const customFields = reactive<Record<string, unknown>>({});
const notes = ref('');

// Read selected slot from query params (set by detail page)
const selectedDate = computed(() => route.query.date as string || '');
const selectedEndDate = computed(() => route.query.end_date as string || '');
const slotStart = computed(() => route.query.start as string || '');
const slotEnd = computed(() => route.query.end as string || '');

const isFlexibleDuration = computed(() =>
  resource.value && resource.value.slot_duration_minutes === null
);

const displayDateTime = computed(() => {
  if (isFlexibleDuration.value) {
    return `${selectedDate.value} → ${selectedEndDate.value}`;
  }
  return `${selectedDate.value}  ${slotStart.value} – ${slotEnd.value}`;
});

function buildStartAt(): string {
  if (isFlexibleDuration.value) {
    return `${selectedDate.value}T14:00:00`;
  }
  // slotStart is "09:00" format
  return `${selectedDate.value}T${slotStart.value}:00`;
}

function buildEndAt(): string {
  if (isFlexibleDuration.value) {
    return `${selectedEndDate.value}T11:00:00`;
  }
  return `${selectedDate.value}T${slotEnd.value}:00`;
}

function handleSubmit() {
  if (!resource.value) return;

  store.pendingCheckout = {
    resource_slug: resourceSlug.value,
    start_at: buildStartAt(),
    end_at: buildEndAt(),
    custom_fields: { ...customFields },
    notes: notes.value || undefined,
  };

  router.push({
    path: `/booking/${resourceSlug.value}/book/pay`,
  });
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
.ghrm-loading, .ghrm-error { text-align: center; padding: 60px 20px; color: #6b7280; }
.ghrm-error { color: #dc2626; }
.ghrm-cta-btn { display: inline-block; padding: 12px 24px; background: #3498db; color: #fff; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 15px; border: none; cursor: pointer; }
.ghrm-cta-btn:hover:not(:disabled) { background: #2980b9; }
.ghrm-cta-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.booking-slot-summary { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
.booking-slot-summary__row { display: flex; justify-content: space-between; font-size: 0.95rem; }
.booking-slot-summary__label { color: #6b7280; font-weight: 500; }

.booking-form { margin-top: 8px; }
.booking-form__section { margin-bottom: 28px; }
.booking-form__field { margin-bottom: 12px; }
.booking-form__field label { display: block; font-size: 14px; color: #374151; margin-bottom: 4px; }
.booking-form__required { color: #dc2626; }
.booking-form__input { width: 100%; max-width: 400px; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
.booking-form__checkbox { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; }
.booking-form__actions { display: flex; align-items: center; gap: 16px; margin-top: 24px; }
.booking-form__error { color: #dc2626; margin-top: 12px; font-size: 14px; }

.booking-back-link { color: #6b7280; text-decoration: none; font-size: 14px; }
.booking-back-link:hover { text-decoration: underline; }
</style>
