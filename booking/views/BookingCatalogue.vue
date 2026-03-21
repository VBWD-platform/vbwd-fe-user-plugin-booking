<template>
  <!-- Resource list view when a category filter is active or showing all -->
  <div class="ghrm-catalogue">
    <div class="ghrm-list-header">
      <h1 class="ghrm-list-title">
        {{ selectedCategory ? selectedCategoryLabel : $t('booking.catalogue.title') }}
      </h1>
      <div class="ghrm-list-controls">
        <input
          v-model="searchQuery"
          class="ghrm-search-input"
          type="text"
          :placeholder="$t('booking.catalogue.search')"
          @input="onSearch"
        >
        <button
          class="ghrm-view-toggle"
          :title="viewMode === 'grid' ? $t('booking.catalogue.switchToList') : $t('booking.catalogue.switchToGrid')"
          @click="viewMode = viewMode === 'grid' ? 'list' : 'grid'"
        >
          {{ viewMode === 'grid' ? '☰' : '⊞' }}
        </button>
      </div>
    </div>

    <!-- Category filter buttons -->
    <div
      v-if="store.categories.length"
      class="booking-category-filters"
    >
      <button
        :class="['booking-category-btn', { active: !selectedCategory }]"
        @click="selectedCategory = null"
      >
        {{ $t('booking.catalogue.all') }}
      </button>
      <button
        v-for="category in store.categories"
        :key="category.id"
        :class="['booking-category-btn', { active: selectedCategory === category.slug }]"
        @click="selectedCategory = category.slug"
      >
        {{ category.name }}
      </button>
    </div>

    <div
      v-if="store.loading"
      class="ghrm-loading"
    >
      {{ $t('booking.catalogue.loading') }}
    </div>
    <div
      v-else-if="!filteredResources.length"
      class="ghrm-empty"
    >
      {{ $t('booking.catalogue.noResources') }}
    </div>
    <div
      v-else
      :class="viewMode === 'grid' ? 'ghrm-grid' : 'ghrm-list'"
    >
      <router-link
        v-for="resource in filteredResources"
        :key="resource.id"
        :to="`/booking/${resource.slug}`"
        :class="viewMode === 'grid' ? 'ghrm-pkg-card' : 'ghrm-pkg-row'"
      >
        <img
          v-if="resource.image_url"
          :src="resource.image_url"
          :alt="resource.name"
          class="ghrm-pkg-icon"
        >
        <div class="ghrm-pkg-info">
          <span class="ghrm-pkg-name">{{ resource.name }}</span>
          <span class="ghrm-pkg-author">{{ resource.resource_type }}</span>
          <span
            v-if="resource.description"
            class="ghrm-pkg-description"
          >{{ resource.description }}</span>
        </div>
        <div class="booking-card-meta">
          <span class="booking-price">{{ resource.price }} {{ resource.currency }} / {{ resource.price_unit.replace('per_', '') }}</span>
          <span
            v-if="resource.capacity > 1"
            class="ghrm-pkg-downloads"
          >{{ $t('booking.catalogue.spots', { count: resource.capacity }) }}</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useBookingStore } from '../stores/booking';

const store = useBookingStore();
const selectedCategory = ref<string | null>(null);
const searchQuery = ref('');
const viewMode = ref<'grid' | 'list'>('grid');

const selectedCategoryLabel = computed(() => {
  if (!selectedCategory.value) return '';
  const found = store.categories.find(category => category.slug === selectedCategory.value);
  return found?.name ?? selectedCategory.value;
});

const filteredResources = computed(() => {
  let resources = store.resources;

  if (selectedCategory.value) {
    resources = resources.filter(resource =>
      resource.categories.some(category => category.slug === selectedCategory.value)
    );
  }

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    resources = resources.filter(resource =>
      resource.name.toLowerCase().includes(query)
      || resource.resource_type.toLowerCase().includes(query)
      || (resource.description && resource.description.toLowerCase().includes(query))
    );
  }

  return resources;
});

function onSearch() {
  // Filtering is reactive via computed — no extra action needed
}

onMounted(async () => {
  await Promise.all([store.fetchCategories(), store.fetchResources()]);
});
</script>

<style scoped>
/* Layout — same as GhrmCatalogueContent */
.ghrm-catalogue { max-width: 1100px; margin: 0 auto; padding: 20px; }
.ghrm-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.ghrm-list-title { font-size: 1.6rem; color: #2c3e50; margin: 0; }
.ghrm-list-controls { display: flex; gap: 8px; align-items: center; }
.ghrm-search-input { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; width: 200px; }
.ghrm-view-toggle { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; font-size: 18px; }

/* Grid & List — same as GHRM */
.ghrm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.ghrm-list { display: flex; flex-direction: column; gap: 8px; }
.ghrm-pkg-card { display: flex; flex-direction: column; gap: 8px; padding: 20px; background: #fff; border: 1px solid #e9ecef; border-radius: 8px; text-decoration: none; transition: all .2s; }
.ghrm-pkg-card:hover { border-color: #3498db; box-shadow: 0 2px 12px rgba(52,152,219,.1); }
.ghrm-pkg-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fff; border: 1px solid #e9ecef; border-radius: 6px; text-decoration: none; }
.ghrm-pkg-row:hover { background: #f0f7ff; }
.ghrm-pkg-icon { width: 40px; height: 40px; object-fit: contain; border-radius: 6px; }
.ghrm-pkg-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.ghrm-pkg-name { font-weight: 600; color: #2c3e50; font-size: 15px; }
.ghrm-pkg-author { font-size: 12px; color: #6b7280; text-transform: capitalize; }
.ghrm-pkg-description { font-size: 13px; color: #6b7280; margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ghrm-pkg-downloads { font-size: 12px; color: #9ca3af; }

/* Booking-specific: price + meta */
.booking-card-meta { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px; }
.booking-price { font-weight: 600; color: #3498db; font-size: 14px; }

/* Category filter buttons */
.booking-category-filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
.booking-category-btn { padding: 6px 16px; border: 1px solid #d1d5db; border-radius: 999px; background: #fff; cursor: pointer; font-size: 13px; color: #374151; transition: all .2s; }
.booking-category-btn:hover { border-color: #3498db; color: #3498db; }
.booking-category-btn.active { background: #3498db; color: #fff; border-color: #3498db; }

/* States */
.ghrm-loading, .ghrm-empty { text-align: center; padding: 48px 20px; color: #6b7280; }
</style>
