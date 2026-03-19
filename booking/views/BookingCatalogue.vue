<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useBookingStore } from '../stores/booking';

const router = useRouter();
const store = useBookingStore();
const selectedCategory = ref<string | null>(null);

const filteredResources = computed(() => {
  if (!selectedCategory.value) return store.resources;
  return store.resources.filter(resource =>
    resource.categories.some(category => category.slug === selectedCategory.value)
  );
});

onMounted(async () => {
  await Promise.all([store.fetchCategories(), store.fetchResources()]);
});

function viewResource(slug: string) {
  router.push(`/booking/${slug}`);
}

function formatPrice(resource: { price: string; currency: string; price_unit: string }) {
  return `${resource.price} ${resource.currency} / ${resource.price_unit.replace('per_', '')}`;
}
</script>

<template>
  <div class="booking-catalogue">
    <h1>Book an Appointment</h1>

    <!-- Category filter buttons -->
    <div class="booking-catalogue__filters" v-if="store.categories.length">
      <button
        :class="['booking-catalogue__filter', { active: !selectedCategory }]"
        @click="selectedCategory = null"
      >
        All
      </button>
      <button
        v-for="category in store.categories"
        :key="category.id"
        :class="['booking-catalogue__filter', { active: selectedCategory === category.slug }]"
        @click="selectedCategory = category.slug"
      >
        {{ category.name }}
      </button>
    </div>

    <!-- Resource cards -->
    <div v-if="store.loading" class="booking-catalogue__loading">Loading resources...</div>

    <div v-else-if="filteredResources.length" class="booking-catalogue__grid">
      <div
        v-for="resource in filteredResources"
        :key="resource.id"
        class="booking-catalogue__card"
        @click="viewResource(resource.slug)"
      >
        <div v-if="resource.image_url" class="booking-catalogue__card-image">
          <img :src="resource.image_url" :alt="resource.name" />
        </div>
        <div class="booking-catalogue__card-body">
          <span class="booking-catalogue__type-badge">{{ resource.resource_type }}</span>
          <h3>{{ resource.name }}</h3>
          <p v-if="resource.description">{{ resource.description }}</p>
          <div class="booking-catalogue__card-meta">
            <span class="booking-catalogue__price">{{ formatPrice(resource) }}</span>
            <span v-if="resource.capacity > 1" class="booking-catalogue__capacity">
              {{ resource.capacity }} spots
            </span>
          </div>
          <div class="booking-catalogue__categories">
            <span
              v-for="category in resource.categories"
              :key="category.id"
              class="booking-catalogue__category-chip"
            >
              {{ category.name }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <p v-else>No resources available.</p>
  </div>
</template>

<style scoped>
.booking-catalogue__filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.booking-catalogue__filter {
  padding: 0.5rem 1rem;
  border: 1px solid var(--vbwd-border, #e2e8f0);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  color: var(--vbwd-text, #1e293b);
}

.booking-catalogue__filter.active {
  background: var(--vbwd-primary, #3498db);
  color: #fff;
  border-color: var(--vbwd-primary, #3498db);
}

.booking-catalogue__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.booking-catalogue__card {
  background: var(--vbwd-bg-card, #fff);
  border: 1px solid var(--vbwd-border, #e2e8f0);
  border-radius: var(--vbwd-radius, 8px);
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.booking-catalogue__card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.booking-catalogue__card-image img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.booking-catalogue__card-body {
  padding: 1.25rem;
}

.booking-catalogue__card-body h3 {
  margin: 0.5rem 0 0.25rem;
}

.booking-catalogue__card-body p {
  color: var(--vbwd-text-secondary, #64748b);
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
}

.booking-catalogue__type-badge {
  background: var(--vbwd-bg-secondary, #f1f5f9);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  text-transform: capitalize;
}

.booking-catalogue__card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.booking-catalogue__price {
  font-weight: 700;
  color: var(--vbwd-primary, #3498db);
}

.booking-catalogue__capacity {
  font-size: 0.85rem;
  color: var(--vbwd-text-secondary, #64748b);
}

.booking-catalogue__categories {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.booking-catalogue__category-chip {
  background: var(--vbwd-bg-secondary, #f1f5f9);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  color: var(--vbwd-text-secondary, #64748b);
}
</style>
