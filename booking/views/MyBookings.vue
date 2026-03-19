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
    <h1>My Bookings</h1>

    <div v-if="store.loading">Loading...</div>

    <table v-else-if="store.userBookings.length" class="my-bookings__table">
      <thead>
        <tr>
          <th>Resource</th>
          <th>Date</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="booking in store.userBookings" :key="booking.id">
          <td>{{ booking.resource?.name || 'Unknown' }}</td>
          <td>{{ new Date(booking.start_at).toLocaleString() }}</td>
          <td>
            <span :class="`booking-status booking-status--${booking.status}`">
              {{ booking.status }}
            </span>
          </td>
          <td>
            <button @click="viewDetail(booking.id)" class="btn btn--small">View</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>You have no bookings yet.</p>
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
