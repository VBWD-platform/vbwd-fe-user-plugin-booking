<template>
  <div
    v-if="open"
    class="booking-cancel-modal"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    @click.self="onKeep"
  >
    <div class="booking-cancel-modal__card">
      <h2
        :id="titleId"
        class="booking-cancel-modal__title"
      >
        {{ $t('booking.detail.actions.cancelConfirmTitle') }}
      </h2>
      <p class="booking-cancel-modal__body">
        {{ $t('booking.detail.actions.cancelConfirmBody', {
          resource: resourceName,
          when: whenDisplay,
        }) }}
      </p>

      <p
        v-if="policyNote"
        class="booking-cancel-modal__policy"
      >
        {{ policyNote }}
      </p>

      <p
        v-if="error"
        class="booking-cancel-modal__error"
      >
        {{ error }}
      </p>

      <div class="booking-cancel-modal__actions">
        <button
          type="button"
          class="btn"
          :disabled="loading"
          @click="onKeep"
        >
          {{ $t('booking.detail.actions.keepBooking') }}
        </button>
        <button
          type="button"
          class="btn btn--danger"
          :disabled="loading"
          @click="onConfirm"
        >
          {{ loading
            ? $t('booking.detail.actions.cancelling')
            : $t('booking.detail.actions.cancelBooking') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface Props {
  open: boolean;
  resourceName: string;
  whenDisplay: string;
  policyNote?: string;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  policyNote: '',
  loading: false,
});

const emit = defineEmits<{
  (event: 'keep'): void;
  (event: 'confirm'): void;
}>();

const titleId = `booking-cancel-title-${Math.random().toString(36).slice(2, 10)}`;
const error = ref('');

watch(() => props.open, (isOpen) => {
  if (isOpen) error.value = '';
});

function onKeep() {
  if (props.loading) return;
  emit('keep');
}

function onConfirm() {
  emit('confirm');
}

defineExpose({ setError: (message: string) => { error.value = message; } });

// Unused but keeps the compiler happy when the caller doesn't bind resourceName.
computed(() => props.resourceName);
</script>

<style scoped>
.booking-cancel-modal {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
}
.booking-cancel-modal__card {
  background: var(--vbwd-surface, #ffffff);
  color: var(--vbwd-text, #1a202c);
  border-radius: 8px;
  max-width: 440px;
  width: 100%;
  padding: 1.75rem;
  box-shadow: 0 20px 40px -20px rgba(15, 23, 42, 0.4);
}
.booking-cancel-modal__title {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
}
.booking-cancel-modal__body {
  margin: 0 0 0.75rem;
  color: var(--vbwd-text-muted, #4a5568);
  line-height: 1.5;
}
.booking-cancel-modal__policy {
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  background: var(--vbwd-surface-muted, #f7fafc);
  border-left: 3px solid var(--vbwd-accent, #3498db);
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--vbwd-text-muted, #4a5568);
}
.booking-cancel-modal__error {
  margin: 0 0 1rem;
  padding: 0.5rem 0.75rem;
  background: #fed7d7;
  color: #742a2a;
  border-radius: 4px;
  font-size: 0.875rem;
}
.booking-cancel-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
.btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--vbwd-border, #cbd5e0);
  border-radius: 4px;
  background: transparent;
  color: var(--vbwd-text, #1a202c);
  cursor: pointer;
  font-size: 0.95rem;
}
.btn:disabled { opacity: 0.6; cursor: not-allowed; }
.btn--danger {
  background: #e53e3e;
  border-color: #e53e3e;
  color: #ffffff;
}
.btn--danger:hover:not(:disabled) { background: #c53030; }
</style>
