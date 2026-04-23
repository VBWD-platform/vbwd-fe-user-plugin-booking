<template>
  <div class="my-bookings">
    <header class="my-bookings__header">
      <h1>{{ $t('booking.myBookings.title') }}</h1>
    </header>

    <div
      class="my-bookings__tabs"
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        class="my-bookings__tab"
        :class="{ 'my-bookings__tab--active': activeTab === 'upcoming' }"
        :aria-selected="activeTab === 'upcoming'"
        @click="setTab('upcoming')"
      >
        {{ $t('booking.myBookings.tabs.upcoming') }}
        <span class="my-bookings__count">{{ store.upcomingBookings.length }}</span>
      </button>
      <button
        type="button"
        role="tab"
        class="my-bookings__tab"
        :class="{ 'my-bookings__tab--active': activeTab === 'past' }"
        :aria-selected="activeTab === 'past'"
        @click="setTab('past')"
      >
        {{ $t('booking.myBookings.tabs.past') }}
        <span class="my-bookings__count">{{ store.pastPagination.total }}</span>
      </button>
    </div>

    <div
      v-if="store.loading"
      class="my-bookings__loading"
    >
      {{ $t('booking.myBookings.loading') }}
    </div>

    <template v-else>
      <div
        v-if="activeTab === 'upcoming'"
        class="my-bookings__panel"
        role="tabpanel"
      >
        <p
          v-if="store.upcomingBookings.length === 0"
          class="my-bookings__empty"
        >
          {{ $t('booking.myBookings.empty.upcoming') }}
        </p>
        <BookingsTable
          v-else
          :bookings="store.upcomingBookings"
          @open="openDetail"
        />
      </div>

      <div
        v-else
        class="my-bookings__panel"
        role="tabpanel"
      >
        <p
          v-if="store.pastBookings.length === 0"
          class="my-bookings__empty"
        >
          {{ $t('booking.myBookings.empty.past') }}
        </p>
        <template v-else>
          <BookingsTable
            :bookings="store.pastBookings"
            @open="openDetail"
          />
          <nav
            v-if="store.pastPagination.totalPages > 1"
            class="my-bookings__pagination"
          >
            <button
              type="button"
              class="btn"
              :disabled="store.pastPagination.page <= 1"
              @click="loadPastPage(store.pastPagination.page - 1)"
            >
              {{ $t('booking.myBookings.pagination.prev') }}
            </button>
            <span class="my-bookings__pagination-info">
              {{ $t('booking.myBookings.pagination.pageOf', {
                page: store.pastPagination.page,
                total: store.pastPagination.totalPages,
              }) }}
            </span>
            <button
              type="button"
              class="btn"
              :disabled="store.pastPagination.page >= store.pastPagination.totalPages"
              @click="loadPastPage(store.pastPagination.page + 1)"
            >
              {{ $t('booking.myBookings.pagination.next') }}
            </button>
          </nav>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useBookingStore } from '../stores/booking';
import BookingsTable from '../components/BookingsTable.vue';

const router = useRouter();
const store = useBookingStore();

const activeTab = ref<'upcoming' | 'past'>('upcoming');

onMounted(async () => {
  await store.fetchUpcomingBookings();
});

async function setTab(tab: 'upcoming' | 'past') {
  activeTab.value = tab;
  if (tab === 'past' && store.pastBookings.length === 0) {
    await store.fetchPastBookings(1, 20);
  }
}

async function loadPastPage(page: number) {
  await store.fetchPastBookings(page, store.pastPagination.perPage);
}

function openDetail(bookingId: string) {
  router.push(`/dashboard/bookings/${bookingId}`);
}
</script>

<style scoped>
.my-bookings {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}
.my-bookings__header h1 {
  margin: 0 0 1rem;
  font-size: 1.5rem;
}
.my-bookings__tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid var(--vbwd-border, #e2e8f0);
  margin-bottom: 1.5rem;
}
.my-bookings__tab {
  padding: 0.75rem 1rem;
  border: none;
  background: transparent;
  color: var(--vbwd-text-muted, #4a5568);
  cursor: pointer;
  font-size: 0.95rem;
  border-bottom: 2px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.my-bookings__tab--active {
  color: var(--vbwd-text, #1a202c);
  border-bottom-color: var(--vbwd-accent, #3498db);
  font-weight: 500;
}
.my-bookings__count {
  font-size: 0.75rem;
  padding: 0.1rem 0.5rem;
  background: var(--vbwd-surface-muted, #edf2f7);
  border-radius: 999px;
  color: var(--vbwd-text-muted, #4a5568);
}
.my-bookings__empty {
  padding: 2rem;
  text-align: center;
  color: var(--vbwd-text-muted, #718096);
}
.my-bookings__loading {
  padding: 2rem;
  text-align: center;
  color: var(--vbwd-text-muted, #4a5568);
}
.my-bookings__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}
.my-bookings__pagination-info {
  color: var(--vbwd-text-muted, #4a5568);
  font-size: 0.9rem;
}
.btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--vbwd-border, #cbd5e0);
  border-radius: 4px;
  background: transparent;
  color: var(--vbwd-text, #1a202c);
  cursor: pointer;
  font-size: 0.9rem;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
