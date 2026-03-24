<template>
  <div class="ghrm-detail">
    <div v-if="store.loading" class="ghrm-loading">
      {{ $t('booking.detail.loading') }}
    </div>
    <div v-else-if="!resource" class="ghrm-error">
      {{ $t('booking.detail.notFound') }}
    </div>

    <template v-else>
      <!-- Image Gallery -->
      <div v-if="resource.images && resource.images.length" class="booking-gallery">
        <div class="booking-gallery__main">
          <img :src="activeImageUrl" :alt="resource.name" class="booking-gallery__main-img" >
        </div>
        <div v-if="resource.images.length > 1" class="booking-gallery__thumbs">
          <button
            v-for="image in resource.images"
            :key="image.id"
            class="booking-gallery__thumb"
            :class="{ active: activeImageUrl === image.url }"
            @click="activeImageUrl = image.url"
          >
            <img :src="image.url" :alt="image.alt || ''" >
          </button>
        </div>
      </div>

      <!-- Header -->
      <div class="ghrm-detail-header">
        <img
          v-if="!resource.images?.length && resource.image_url"
          :src="resource.image_url"
          :alt="resource.name"
          class="ghrm-detail-icon"
        >
        <div class="ghrm-detail-meta">
          <h1 class="ghrm-detail-name">{{ resource.name }}</h1>
          <p class="ghrm-detail-author">{{ resource.resource_type }}</p>
          <div class="ghrm-detail-badges">
            <span class="ghrm-badge ghrm-badge--version">
              {{ resource.price }} {{ resource.currency }} / {{ resource.price_unit.replace('per_', '') }}
            </span>
            <span v-if="resource.capacity > 1" class="ghrm-badge ghrm-badge--downloads">
              {{ $t('booking.catalogue.spots', { count: resource.capacity }) }}
            </span>
            <span v-for="category in resource.categories" :key="category.id" class="ghrm-badge ghrm-badge--downloads">
              {{ category.name }}
            </span>
          </div>
        </div>
      </div>

      <!-- Description -->
      <p v-if="resource.description" class="ghrm-detail-description">
        {{ resource.description }}
      </p>

      <!-- Availability section — pick date + slot, then Book Now -->
      <div class="ghrm-features">
        <h3 class="ghrm-section-label">{{ $t('booking.detail.availability') }}</h3>

        <!-- Date picker (fixed slots) or date range (flexible) -->
        <template v-if="isFlexibleDuration">
          <div class="booking-date-picker">
            <label>{{ $t('booking.form.checkIn') }}</label>
            <input v-model="selectedDate" type="date" :min="todayString" >
          </div>
          <div class="booking-date-picker">
            <label>{{ $t('booking.form.checkOut') }}</label>
            <input v-model="selectedEndDate" type="date" :min="selectedDate || todayString" >
          </div>
        </template>
        <template v-else>
          <div class="booking-date-picker">
            <label>{{ $t('booking.detail.selectDate') }}</label>
            <input v-model="selectedDate" type="date" :min="todayString" @change="loadAvailability" >
          </div>

          <div v-if="store.availableSlots.length" class="booking-slots-grid">
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
              <span class="booking-slot__capacity">{{ $t('booking.detail.available', { count: slot.available_capacity }) }}</span>
            </button>
          </div>
          <p v-else-if="selectedDate" class="ghrm-muted">{{ $t('booking.detail.noSlots') }}</p>
          <p v-else class="ghrm-muted">{{ $t('booking.detail.pickDate') }}</p>
        </template>
      </div>

      <!-- Book Now CTA -->
      <div class="ghrm-detail-cta-section">
        <button
          class="ghrm-cta-btn"
          :disabled="!canProceed"
          @click="handleBookNow"
        >
          {{ $t('booking.detail.bookNow') }}
        </button>
      </div>

      <!-- Back link -->
      <div class="booking-back">
        <router-link to="/booking" class="booking-back-link">
          ← {{ $t('booking.detail.backToCatalogue') }}
        </router-link>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBookingStore } from '../stores/booking';
import { bookingConfig } from '../bookingConfig';

const route = useRoute();
const router = useRouter();
const store = useBookingStore();

const selectedDate = ref('');
const selectedEndDate = ref('');
const selectedSlotIndex = ref<number | null>(null);

const resourceSlug = computed(() => route.params.slug as string);
const resource = computed(() => store.currentResource);
const activeImageUrl = ref('');

const todayString = computed(() => new Date().toISOString().split('T')[0]);
const isFlexibleDuration = computed(() => resource.value && resource.value.slot_duration_minutes === null);

const selectedSlot = computed(() => {
  if (selectedSlotIndex.value === null) return null;
  return store.availableSlots[selectedSlotIndex.value] ?? null;
});

const canProceed = computed(() => {
  if (isFlexibleDuration.value) {
    return selectedDate.value && selectedEndDate.value && selectedEndDate.value > selectedDate.value;
  }
  return selectedDate.value && selectedSlot.value && selectedSlot.value.available_capacity > 0;
});

function formatSlotTime(slot: { start?: string; end?: string; date?: string }) {
  if (slot.start && slot.end) {
    // Handle both "09:00" and "2026-03-23T09:00:00" formats
    const startTime = slot.start.includes('T') ? slot.start.slice(11, 16) : slot.start;
    const endTime = slot.end.includes('T') ? slot.end.slice(11, 16) : slot.end;
    return `${startTime} – ${endTime}`;
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

function handleBookNow() {
  if (!resource.value || !canProceed.value) return;

  const query: Record<string, string> = {
    date: selectedDate.value,
  };

  if (isFlexibleDuration.value) {
    query.end_date = selectedEndDate.value;
  } else if (selectedSlot.value) {
    query.start = selectedSlot.value.start || '';
    query.end = selectedSlot.value.end || '';
  }

  router.push({
    path: `/${bookingConfig.bookingFormSlug}/${resource.value.slug}`,
    query,
  });
}

onMounted(async () => {
  if (resourceSlug.value) {
    await store.fetchResourceBySlug(resourceSlug.value);
    if (store.currentResource) {
      activeImageUrl.value = store.currentResource.image_url || '';
    }
  }
});

watch(resourceSlug, async (slug) => {
  if (slug) {
    await store.fetchResourceBySlug(slug);
    if (store.currentResource) {
      activeImageUrl.value = store.currentResource.image_url || '';
    }
    selectedDate.value = '';
    selectedSlotIndex.value = null;
    store.availableSlots = [];
  }
});
</script>

<style scoped>
/* Image gallery */
.booking-gallery { margin-bottom: 24px; }
.booking-gallery__main { width: 100%; max-height: 400px; overflow: hidden; border-radius: 10px; border: 1px solid #e9ecef; }
.booking-gallery__main-img { width: 100%; height: 100%; max-height: 400px; object-fit: cover; display: block; }
.booking-gallery__thumbs { display: flex; gap: 8px; margin-top: 10px; overflow-x: auto; padding-bottom: 4px; }
.booking-gallery__thumb { flex-shrink: 0; width: 72px; height: 72px; border: 2px solid transparent; border-radius: 6px; overflow: hidden; cursor: pointer; padding: 0; background: none; transition: border-color .2s; }
.booking-gallery__thumb.active { border-color: #3498db; }
.booking-gallery__thumb:hover { border-color: #93c5fd; }
.booking-gallery__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Same layout as GhrmPackageDetail */
.ghrm-detail { max-width: 1100px; margin: 0 auto; padding: 24px 20px; }
.ghrm-detail-header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 16px; flex-wrap: wrap; }
.ghrm-detail-description { color: #4b5563; font-size: 15px; line-height: 1.6; margin-bottom: 28px; }
.ghrm-detail-icon { width: 80px; height: 80px; object-fit: contain; border-radius: 12px; border: 1px solid #e9ecef; flex-shrink: 0; }
.ghrm-detail-meta { flex: 1; }
.ghrm-detail-name { font-size: 1.8rem; color: #2c3e50; margin: 0 0 4px; }
.ghrm-detail-author { color: #6b7280; font-size: 14px; margin: 0 0 10px; text-transform: capitalize; }
.ghrm-detail-badges { display: flex; gap: 8px; flex-wrap: wrap; }
.ghrm-badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.ghrm-badge--version { background: #e8f4fd; color: #1a73e8; font-family: monospace; }
.ghrm-badge--downloads { background: #f3f4f6; color: #6b7280; }

.ghrm-detail-cta-section { margin-bottom: 28px; }
.ghrm-cta-btn { display: inline-block; padding: 12px 24px; background: #3498db; color: #fff; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 15px; border: none; cursor: pointer; }
.ghrm-cta-btn:hover:not(:disabled) { background: #2980b9; }
.ghrm-cta-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Sections */
.ghrm-features { margin-bottom: 28px; }
.ghrm-section-label { font-size: 0.82rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; margin: 0 0 10px; }
.ghrm-features-table { border-collapse: collapse; width: 100%; }
.ghrm-features-table td { padding: 7px 8px; border-bottom: 1px solid #f0f0f0; color: #374151; font-size: 0.9rem; }
.ghrm-feature-check { color: #27ae60; font-weight: 700; width: 28px; }
.ghrm-muted { color: #9ca3af; font-style: italic; }
.ghrm-loading, .ghrm-error { text-align: center; padding: 60px 20px; color: #6b7280; }
.ghrm-error { color: #dc2626; }

/* Date picker + slots */
.booking-date-picker { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.booking-date-picker label { font-size: 14px; color: #374151; font-weight: 500; }
.booking-date-picker input { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
.booking-slots-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-bottom: 16px; }
.booking-slot { display: flex; flex-direction: column; gap: 2px; padding: 10px; background: #fff; border: 1px solid #e9ecef; border-radius: 6px; text-align: center; cursor: pointer; transition: border-color .2s; }
.booking-slot:hover:not(.full):not(:disabled) { border-color: #3498db; }
.booking-slot.selected { border-color: #3498db; background: #e8f4fd; }
.booking-slot.full { opacity: 0.4; cursor: not-allowed; }
.booking-slot__time { font-weight: 600; color: #2c3e50; font-size: 14px; }
.booking-slot__capacity { font-size: 11px; color: #6b7280; }

/* Back link */
.booking-back { margin-top: 32px; }
.booking-back-link { color: #3498db; text-decoration: none; font-size: 14px; }
.booking-back-link:hover { text-decoration: underline; }
</style>
