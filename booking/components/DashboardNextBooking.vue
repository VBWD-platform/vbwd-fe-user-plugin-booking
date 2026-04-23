<template>
  <section class="dashboard-next-booking">
    <header class="dashboard-next-booking__header">
      <h2>{{ $t('booking.dashboard.title') }}</h2>
      <router-link
        v-if="store.upcomingBookings.length"
        to="/dashboard/bookings"
        class="dashboard-next-booking__view-all"
      >
        {{ $t('booking.dashboard.viewAll') }} →
      </router-link>
    </header>

    <div
      v-if="loading"
      class="dashboard-next-booking__skeleton"
    >
      <div class="dashboard-next-booking__skeleton-row" />
      <div class="dashboard-next-booking__skeleton-row" />
      <div class="dashboard-next-booking__skeleton-row" />
    </div>

    <p
      v-else-if="displayBookings.length === 0"
      class="dashboard-next-booking__empty"
    >
      {{ $t('booking.dashboard.empty') }}
    </p>

    <ul
      v-else
      class="dashboard-next-booking__list"
    >
      <li
        v-for="booking in displayBookings"
        :key="booking.id"
        tabindex="0"
        class="dashboard-next-booking__row"
        @click="openDetail(booking.id)"
        @keydown.enter.prevent="openDetail(booking.id)"
        @keydown.space.prevent="openDetail(booking.id)"
      >
        <div class="dashboard-next-booking__row-main">
          <span class="dashboard-next-booking__resource">
            {{ booking.resource?.name || $t('booking.myBookings.unknown') }}
          </span>
          <span class="dashboard-next-booking__when">
            {{ formatWhen(booking.start_at) }}
          </span>
        </div>
        <span :class="`booking-status booking-status--${booking.status}`">
          {{ $t(`booking.status.${booking.status}`) }}
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useBookingStore } from '../stores/booking';

const router = useRouter();
const { locale } = useI18n();
const store = useBookingStore();

const loading = ref(true);

onMounted(async () => {
  try {
    await store.fetchUpcomingBookings();
  } finally {
    loading.value = false;
  }
});

const displayBookings = computed(() => store.nextUpcomingBookings3);

function formatWhen(isoString: string): string {
  return new Date(isoString).toLocaleString(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function openDetail(bookingId: string) {
  router.push(`/dashboard/bookings/${bookingId}`);
}
</script>

<style scoped>
.dashboard-next-booking {
  background: var(--vbwd-surface, #ffffff);
  border: 1px solid var(--vbwd-border, #e2e8f0);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
}
.dashboard-next-booking__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
.dashboard-next-booking__header h2 {
  margin: 0;
  font-size: 1.1rem;
}
.dashboard-next-booking__view-all {
  color: var(--vbwd-accent, #3498db);
  text-decoration: none;
  font-size: 0.85rem;
}
.dashboard-next-booking__view-all:hover { text-decoration: underline; }

.dashboard-next-booking__empty {
  margin: 0;
  color: var(--vbwd-text-muted, #718096);
  font-size: 0.9rem;
}
.dashboard-next-booking__list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.dashboard-next-booking__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--vbwd-border, #edf2f7);
  cursor: pointer;
  outline: none;
}
.dashboard-next-booking__row:last-child { border-bottom: none; }
.dashboard-next-booking__row:hover,
.dashboard-next-booking__row:focus {
  background: var(--vbwd-surface-muted, #f7fafc);
}
.dashboard-next-booking__row-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.dashboard-next-booking__resource {
  font-weight: 500;
  color: var(--vbwd-text, #1a202c);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dashboard-next-booking__when {
  font-size: 0.85rem;
  color: var(--vbwd-text-muted, #718096);
}

.booking-status {
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  text-transform: capitalize;
}
.booking-status--confirmed { background: #dcfce7; color: #166534; }
.booking-status--pending { background: #fef9c3; color: #854d0e; }
.booking-status--cancelled { background: #fee2e2; color: #991b1b; }
.booking-status--completed { background: #dbeafe; color: #1e40af; }

.dashboard-next-booking__skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.dashboard-next-booking__skeleton-row {
  height: 2.5rem;
  border-radius: 4px;
  background: linear-gradient(90deg, #edf2f7 25%, #e2e8f0 50%, #edf2f7 75%);
  background-size: 200% 100%;
  animation: dashboard-next-booking-shimmer 1.2s infinite;
}
@keyframes dashboard-next-booking-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
</style>
