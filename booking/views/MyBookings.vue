<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useBookingStore } from '../stores/booking';

const router = useRouter();
const store = useBookingStore();

onMounted(() => {
  store.fetchUserBookings();
});

function viewDetail(bookingId: string) {
  router.push(`/dashboard/bookings/${bookingId}`);
}
</script>

<template>
  <div class="my-bookings">
    <h1>{{ $t('booking.myBookings.title') }}</h1>

    <div v-if="store.loading">{{ $t('booking.myBookings.loading') }}</div>

    <table v-else-if="store.userBookings.length" class="my-bookings__table">
      <thead>
        <tr>
          <th>{{ $t('booking.myBookings.table.resource') }}</th>
          <th>{{ $t('booking.myBookings.table.date') }}</th>
          <th>{{ $t('booking.myBookings.table.status') }}</th>
          <th>{{ $t('booking.myBookings.table.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="booking in store.userBookings" :key="booking.id">
          <td>{{ booking.resource?.name || $t('booking.myBookings.unknown') }}</td>
          <td>{{ new Date(booking.start_at).toLocaleString() }}</td>
          <td>
            <span :class="`booking-status booking-status--${booking.status}`">
              {{ booking.status }}
            </span>
          </td>
          <td>
            <button @click="viewDetail(booking.id)" class="btn btn--small">{{ $t('booking.myBookings.view') }}</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>{{ $t('booking.myBookings.noBookings') }}</p>
  </div>
</template>

<style scoped>
.my-bookings__table {
  width: 100%;
  border-collapse: collapse;
}

.my-bookings__table th,
.my-bookings__table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--vbwd-border, #e2e8f0);
  text-align: left;
}

.btn--small {
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--vbwd-border, #e2e8f0);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: var(--vbwd-primary, #3498db);
}

.booking-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
}

.booking-status--confirmed { background: #dcfce7; color: #166534; }
.booking-status--pending { background: #fef9c3; color: #854d0e; }
.booking-status--cancelled { background: #fee2e2; color: #991b1b; }
.booking-status--completed { background: #dbeafe; color: #1e40af; }
</style>
