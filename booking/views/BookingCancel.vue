<template>
  <div class="booking-cancel">
    <div class="cancel-banner">
      <h1>{{ $t('booking.cancel.title') }}</h1>
      <p>{{ $t('booking.cancel.message') }}</p>
    </div>

    <div class="cancel-actions">
      <router-link
        to="/booking"
        class="btn primary"
      >
        {{ $t('booking.cancel.browseCatalogue') }}
      </router-link>
      <a
        href="#"
        class="btn secondary"
        @click.prevent="goBack"
      >
        {{ $t('booking.cancel.tryAgain') }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function goBack() {
  router.back();
}
</script>

<style scoped>
.booking-cancel { max-width: 600px; margin: 0 auto; padding: 60px 20px; text-align: center; }

.cancel-banner { padding: 30px; border-radius: 10px; background: #fef9c3; color: #854d0e; margin-bottom: 30px; }
.cancel-banner h1 { margin: 0 0 8px; font-size: 1.6rem; }
.cancel-banner p { margin: 0; font-size: 1rem; }

.cancel-actions { display: flex; justify-content: center; gap: 15px; }
.btn { padding: 12px 24px; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; text-decoration: none; display: inline-block; }
.btn.primary { background-color: #3498db; color: white; }
.btn.primary:hover { background-color: #2980b9; }
.btn.secondary { background-color: #ecf0f1; color: #2c3e50; }
.btn.secondary:hover { background-color: #bdc3c7; }

@media (max-width: 600px) {
  .cancel-actions { flex-direction: column; }
  .btn { width: 100%; text-align: center; }
}
</style>
