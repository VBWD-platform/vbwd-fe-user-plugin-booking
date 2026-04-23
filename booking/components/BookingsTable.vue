<template>
  <table class="bookings-table">
    <thead>
      <tr>
        <th>{{ $t('booking.myBookings.table.resource') }}</th>
        <th>{{ $t('booking.myBookings.table.date') }}</th>
        <th>{{ $t('booking.myBookings.table.status') }}</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="booking in bookings"
        :key="booking.id"
        tabindex="0"
        class="bookings-table__row"
        @click="$emit('open', booking.id)"
        @keydown.enter.prevent="$emit('open', booking.id)"
        @keydown.space.prevent="$emit('open', booking.id)"
      >
        <td>{{ booking.resource?.name || $t('booking.myBookings.unknown') }}</td>
        <td>{{ formatWhen(booking.start_at) }}</td>
        <td>
          <span :class="`booking-status booking-status--${booking.status}`">
            {{ $t(`booking.status.${booking.status}`) }}
          </span>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { Booking } from '../stores/booking';

interface Props {
  bookings: Booking[];
}

defineProps<Props>();
defineEmits<{
  (event: 'open', bookingId: string): void;
}>();

const { locale } = useI18n();

function formatWhen(isoString: string): string {
  return new Date(isoString).toLocaleString(locale.value, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
</script>

<style scoped>
.bookings-table {
  width: 100%;
  border-collapse: collapse;
}
.bookings-table th,
.bookings-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--vbwd-border, #e2e8f0);
}
.bookings-table th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vbwd-text-muted, #4a5568);
  font-weight: 500;
}
.bookings-table__row {
  cursor: pointer;
  outline: none;
}
.bookings-table__row:hover,
.bookings-table__row:focus {
  background: var(--vbwd-surface-muted, #f7fafc);
}
.booking-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  text-transform: capitalize;
  display: inline-block;
}
.booking-status--confirmed { background: #dcfce7; color: #166534; }
.booking-status--pending { background: #fef9c3; color: #854d0e; }
.booking-status--cancelled { background: #fee2e2; color: #991b1b; }
.booking-status--completed { background: #dbeafe; color: #1e40af; }
</style>
