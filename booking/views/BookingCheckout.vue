<template>
  <div class="public-checkout">
    <h1 data-testid="checkout-title">
      {{ $t('booking.checkout.title') }}
    </h1>

    <!-- Loading -->
    <div
      v-if="loading"
      class="loading-state"
    >
      <div class="spinner" />
      <p>{{ $t('booking.form.loading') }}</p>
    </div>

    <!-- Not found -->
    <div
      v-else-if="!bookingData || !resource"
      class="error-state"
    >
      <p>{{ $t('booking.checkout.bookingNotFound') }}</p>
      <router-link
        to="/booking"
        class="btn secondary"
      >
        {{ $t('booking.detail.backToCatalogue') }}
      </router-link>
    </div>

    <!-- Checkout Form -->
    <div
      v-else
      class="checkout-content"
    >
      <!-- Step 1: Email Block (login/register) -->
      <EmailBlock
        :initial-email="userEmail"
        :is-authenticated="isAuthenticated"
        class="card"
        @authenticated="handleAuthenticated"
        @logout="handleLogout"
      />

      <!-- Order Summary — full booking details -->
      <div class="card order-summary">
        <h2>{{ $t('booking.checkout.orderSummary') }}</h2>

        <!-- Resource info -->
        <div class="booking-resource-block">
          <img
            v-if="resource.image_url"
            :src="resource.image_url"
            :alt="resource.name"
            class="booking-resource-image"
          >
          <div class="booking-resource-info">
            <div class="plan-row">
              <router-link
                :to="`/booking/${resource.slug}`"
                class="booking-resource-name"
              >
                {{ resource.name }}
              </router-link>
              <span class="booking-resource-price">{{ resource.price }} {{ resource.currency }}</span>
            </div>
            <p class="plan-description">
              {{ resource.resource_type }}
            </p>
            <p
              v-if="resource.description"
              class="plan-description"
            >
              {{ resource.description }}
            </p>
          </div>
        </div>

        <!-- Booking details -->
        <div class="booking-details-block">
          <div class="booking-detail-row">
            <span>{{ $t('booking.checkout.dateTime') }}</span>
            <span>{{ formatDateTime(bookingData.start_at) }} — {{ formatDateTime(bookingData.end_at) }}</span>
          </div>
          <div
            v-if="bookingData.quantity > 1"
            class="booking-detail-row"
          >
            <span>{{ $t('booking.checkout.quantity') }}</span>
            <span>{{ bookingData.quantity }}</span>
          </div>
          <div
            v-if="bookingData.notes"
            class="booking-detail-row"
          >
            <span>{{ $t('booking.checkout.notes') }}</span>
            <span>{{ bookingData.notes }}</span>
          </div>
          <div
            v-for="(value, key) in (bookingData.custom_fields || {})"
            :key="String(key)"
            class="booking-detail-row"
          >
            <span>{{ key }}</span>
            <span>{{ value }}</span>
          </div>
        </div>

        <!-- Total -->
        <div class="total">
          <strong>{{ $t('booking.checkout.total') }}: {{ resource.price }} {{ resource.currency }}</strong>
        </div>
      </div>

      <!-- Step 2: Billing Address -->
      <BillingAddressBlock
        :key="isAuthenticated ? 'auth' : 'anon'"
        class="card"
        @valid="handleBillingAddressValid"
      />

      <!-- Step 3: Payment Methods -->
      <PaymentMethodsBlock
        class="card"
        @selected="handlePaymentMethodSelected"
      />

      <!-- Step 4: Terms and Conditions -->
      <TermsCheckbox @change="handleTermsChange" />

      <!-- Requirements Status -->
      <div
        v-if="missingRequirements.length > 0"
        class="requirements"
      >
        <p><strong>{{ $t('booking.checkout.requirementsTitle') }}</strong></p>
        <ul>
          <li
            v-for="req in missingRequirements"
            :key="req"
          >
            {{ req }}
          </li>
        </ul>
      </div>

      <!-- Confirm Section -->
      <div class="checkout-actions">
        <router-link
          :to="`/booking/${resource.slug}`"
          class="btn secondary"
        >
          {{ $t('booking.form.cancel') }}
        </router-link>
        <button
          class="btn primary pay-button"
          :disabled="!canPay"
          @click="handlePay"
        >
          {{ paying ? $t('booking.checkout.processing') : $t('booking.checkout.payNow') + ' ' + resource.price + ' ' + resource.currency }}
        </button>
      </div>

      <!-- Error -->
      <div
        v-if="errorMessage"
        class="error-message"
      >
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { isAuthenticated as checkAuth } from '@/api';
import EmailBlock from '@/components/checkout/EmailBlock.vue';
import PaymentMethodsBlock from '@/components/checkout/PaymentMethodsBlock.vue';
import TermsCheckbox from '@/components/checkout/TermsCheckbox.vue';
import BillingAddressBlock from '@/components/checkout/BillingAddressBlock.vue';
import { useBookingStore } from '../stores/booking';

const route = useRoute();
const router = useRouter();
const store = useBookingStore();

const loading = ref(true);
const paying = ref(false);
const errorMessage = ref('');

// Auth state
const isAuthenticated = ref(checkAuth());
const userEmail = ref(localStorage.getItem('user_email') || '');

// Form state
const selectedPaymentMethod = ref<string | null>(null);
const termsAccepted = ref(false);
const billingAddressValid = ref(false);

// Data — from pendingCheckout (set by BookingForm)
const bookingData = computed(() => store.pendingCheckout);
const resource = computed(() => store.currentResource);
const invoiceId = ref<string | null>(null);

const canPay = computed(() =>
  isAuthenticated.value &&
  selectedPaymentMethod.value &&
  billingAddressValid.value &&
  termsAccepted.value &&
  !paying.value
);

const missingRequirements = computed(() => {
  const reqs: string[] = [];
  if (!isAuthenticated.value) reqs.push('Please log in or create an account');
  if (!selectedPaymentMethod.value) reqs.push('Select a payment method');
  if (!billingAddressValid.value) reqs.push('Enter billing address');
  if (!termsAccepted.value) reqs.push('Accept the terms and conditions');
  return reqs;
});

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function handleAuthenticated(_userId: string) {
  isAuthenticated.value = true;
}

function handleLogout() {
  isAuthenticated.value = false;
  userEmail.value = '';
}

function handlePaymentMethodSelected(methodCode: string) {
  selectedPaymentMethod.value = methodCode;
}

function handleTermsChange(accepted: boolean) {
  termsAccepted.value = accepted;
}

function handleBillingAddressValid(isValid: boolean) {
  billingAddressValid.value = isValid;
}

async function handlePay() {
  if (!bookingData.value || !canPay.value) return;
  paying.value = true;
  errorMessage.value = '';
  try {
    // Create invoice via checkout API (user is authenticated at this point)
    if (!invoiceId.value) {
      const result = await store.checkout(bookingData.value);
      invoiceId.value = result.invoice_id;
    }

    if (invoiceId.value && selectedPaymentMethod.value) {
      router.push({
        path: `/pay/${selectedPaymentMethod.value}`,
        query: { invoice: invoiceId.value },
      });
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Checkout failed';
  } finally {
    paying.value = false;
  }
}

onMounted(async () => {
  try {
    if (!store.pendingCheckout) {
      loading.value = false;
      return;
    }
    await store.fetchResourceBySlug(store.pendingCheckout.resource_slug);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.public-checkout { max-width: 900px; margin: 0 auto; padding: 40px 20px; }
h1 { margin-bottom: 30px; color: #2c3e50; }

.loading-state, .error-state { text-align: center; padding: 60px 20px; color: #666; }
.spinner { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.checkout-content { display: flex; flex-direction: column; gap: 20px; }

.card { background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05); }
.card h2 { margin-bottom: 20px; color: #2c3e50; font-size: 1.2rem; border-bottom: 1px solid #eee; padding-bottom: 10px; }

/* Resource block */
.booking-resource-block { display: flex; gap: 16px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
.booking-resource-image { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
.booking-resource-info { flex: 1; }
.booking-resource-name { font-weight: 600; color: #3498db; text-decoration: none; }
.booking-resource-name:hover { text-decoration: underline; }
.booking-resource-price { font-weight: 600; color: #3498db; }

.plan-row { display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 600; color: #2c3e50; }
.plan-description { color: #666; font-size: 0.9rem; margin-top: 8px; }

/* Booking details */
.booking-details-block { margin-bottom: 16px; }
.booking-detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f8f9fa; font-size: 0.95rem; }
.booking-detail-row span:first-child { color: #6b7280; font-weight: 500; }

.total { margin-top: 15px; padding-top: 15px; border-top: 2px solid #eee; font-size: 1.2rem; text-align: right; }

.checkout-actions { display: flex; justify-content: space-between; align-items: center; gap: 15px; padding-top: 10px; }

.requirements { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #ffc107; }
.requirements p { margin: 0 0 8px 0; color: #856404; }
.requirements ul { margin: 0; padding-left: 20px; color: #856404; }

.btn { padding: 12px 24px; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; text-decoration: none; display: inline-block; transition: background-color 0.2s; }
.btn.primary { background-color: #3498db; color: white; }
.btn.primary:hover:not(:disabled) { background-color: #2980b9; }
.btn.primary:disabled { background-color: #95a5a6; cursor: not-allowed; }
.btn.secondary { background-color: #ecf0f1; color: #2c3e50; }
.btn.secondary:hover { background-color: #bdc3c7; }

.error-message { background: #fee; color: #c00; padding: 15px; border-radius: 8px; margin-top: 15px; }
.pay-button { min-width: 180px; }

@media (max-width: 600px) {
  .checkout-actions { flex-direction: column; }
  .btn { width: 100%; text-align: center; }
  .booking-resource-block { flex-direction: column; }
}
</style>
