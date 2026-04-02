<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

onMounted(() => {
  router.replace({
    path: '/checkout/confirmation',
    query: { invoice_id: route.query.invoice_id as string },
  });
});
</script>

<template>
  <div style="text-align:center;padding:60px">
    Redirecting...
  </div>
</template>
