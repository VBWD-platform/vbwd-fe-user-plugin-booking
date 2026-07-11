<template>
  <div
    class="booking-catalogue"
    data-testid="booking-catalogue"
  >
    <div class="booking-catalogue__header">
      <h1 class="booking-catalogue__title">
        {{ $t('booking.catalogue.title') }}
      </h1>
      <div class="booking-catalogue__controls">
        <input
          v-model="searchMirror"
          class="booking-catalogue__search"
          type="text"
          :placeholder="$t('booking.catalogue.search')"
          data-testid="booking-catalogue-search"
          @input="onSearchInput"
        >
        <button
          class="booking-catalogue__view-toggle"
          type="button"
          :title="viewMode === 'grid' ? $t('booking.catalogue.switchToList') : $t('booking.catalogue.switchToGrid')"
          @click="viewMode = viewMode === 'grid' ? 'list' : 'grid'"
        >
          {{ viewMode === 'grid' ? '☰' : '⊞' }}
        </button>
      </div>
    </div>

    <CatalogueFilterBar
      v-if="facets.length"
      :facets="facets"
      :values="filters.values.value"
      :tags="filters.activeTags.value"
      :date-range="dateRangeValues"
      :resolved-options="resolvedOptions"
      :all-label="$t('booking.catalogue.all')"
      @facet-change="onFacetChange"
      @tag-toggle="onTagToggle"
      @range-change="onRangeChange"
    />

    <div
      v-if="loading"
      class="ghrm-loading"
      data-testid="booking-catalogue-loading"
    >
      {{ $t('booking.catalogue.loading') }}
    </div>
    <div
      v-else-if="error"
      class="ghrm-empty"
      data-testid="booking-catalogue-error"
    >
      {{ error }}
    </div>
    <div
      v-else-if="!items.length"
      class="ghrm-empty"
      data-testid="booking-catalogue-empty"
    >
      {{ $t('booking.catalogue.noResources') }}
    </div>
    <div
      v-else
      :class="viewMode === 'grid' ? 'ghrm-grid' : 'ghrm-list'"
    >
      <router-link
        v-for="resource in items"
        :key="resource.id"
        :to="`/booking/${resource.slug}`"
        :class="viewMode === 'grid' ? 'ghrm-pkg-card' : 'ghrm-pkg-row'"
        :data-testid="`booking-resource-card-${resource.slug}`"
      >
        <img
          v-if="resource.image_url"
          :src="resource.image_url"
          :alt="resource.name"
          class="ghrm-pkg-icon"
        >
        <div class="ghrm-pkg-info">
          <span
            class="ghrm-pkg-name"
            data-testid="booking-resource-name"
          >{{ resource.name }}</span>
          <span class="ghrm-pkg-author">{{ resource.resource_type }}</span>
          <span
            v-if="resource.description"
            class="ghrm-pkg-description"
          >{{ resource.description }}</span>
          <div
            v-if="resource.tags && resource.tags.length"
            class="booking-card-tags"
          >
            <button
              v-for="tag in resource.tags"
              :key="tag"
              type="button"
              class="booking-card-tag"
              :class="{ 'booking-card-tag--active': filters.activeTags.value.includes(tag) }"
              :data-testid="`booking-resource-tag-${resource.slug}-${tag}`"
              @click.stop.prevent="onTagToggle(tag)"
            >
              {{ tagLabel(tag) }}
            </button>
          </div>
        </div>
        <div class="booking-card-meta">
          <span class="booking-price">
            <PriceDisplay
              :effective-display-mode="resource.pricing?.effective_display_mode"
              :global-mode="resource.pricing?.prices_display_mode"
              :net-amount="resource.pricing?.net_amount ?? resource.price"
              :gross-amount="resource.pricing?.gross_amount ?? resource.price"
              :currency="resource.currency"
            /> / {{ resource.price_unit.replace('per_', '') }}
          </span>
          <span
            v-if="resource.capacity > 1"
            class="ghrm-pkg-downloads"
          >{{ $t('booking.catalogue.spots', { count: resource.capacity }) }}</span>
        </div>
      </router-link>
    </div>

    <div
      v-if="pages > 1"
      class="booking-catalogue__pager"
      data-testid="booking-catalogue-pager"
    >
      <button
        type="button"
        data-testid="booking-catalogue-prev"
        :disabled="filters.page.value <= 1"
        @click="filters.setPage(filters.page.value - 1)"
      >
        ←
      </button>
      <span>{{ filters.page.value }} / {{ pages }}</span>
      <button
        type="button"
        data-testid="booking-catalogue-next"
        :disabled="filters.page.value >= pages"
        @click="filters.setPage(filters.page.value + 1)"
      >
        →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useCatalogueFilters, CatalogueFilterBar } from 'vbwd-view-component';
import type { FacetDescriptor, FacetOption } from 'vbwd-view-component';
import { api } from '@/api';
import PriceDisplay from '@/components/PriceDisplay.vue';
import type { BookableResource } from '../stores/booking';

interface CatalogueEnvelope {
  items: BookableResource[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// The CMS vue-component widget renderer spreads the seeded content_json.props
// onto this component, so an operator-configured page size arrives as a prop.
const props = defineProps<{ items_per_page?: number }>();

const DEFAULT_PER_PAGE = 12;
// The api client already prepends this base URL; descriptor endpoints are
// absolute (contract §4) so we strip it before calling api.get.
const API_PREFIX = '/api/v1';

const route = useRoute();
const perPage = computed(() => props.items_per_page ?? DEFAULT_PER_PAGE);
const filters = useCatalogueFilters({ perPage });

const loading = ref(true);
const error = ref<string | null>(null);
const items = ref<BookableResource[]>([]);
const pages = ref(1);
const facets = ref<FacetDescriptor[]>([]);
const resolvedOptions = ref<Record<string, FacetOption[]>>({});
const viewMode = ref<'grid' | 'list'>('grid');
// Local mirror of the URL `q` — the input debounces before pushing to the URL.
const searchMirror = ref(filters.query.value);

// Current bounds for every date-range facet in the descriptor (e.g.
// `availability` → `availability_from`/`availability_to`), keyed by facet name
// for the bar. Derived from the descriptor so no facet key is hard-coded here.
const dateRangeValues = computed<Record<string, { from: string; to: string }>>(() => {
  const result: Record<string, { from: string; to: string }> = {};
  for (const facet of facets.value) {
    if (facet.control === 'date-range') {
      result[facet.key] = filters.dateRange(facet.key);
    }
  }
  return result;
});

function tagLabel(slug: string): string {
  return resolvedOptions.value.tags?.find((option) => option.value === slug)?.label ?? slug;
}

// Map a dynamic options response ({ "<key>s": [...] }) to the fe-core
// { value, label } shape. The response carries a single array under a
// vocabulary key we do not hard-code, so we take the first array value.
function mapOptions(response: Record<string, unknown>): FacetOption[] {
  const list = Object.values(response).find((value) => Array.isArray(value)) as
    | Array<Record<string, unknown>>
    | undefined;
  if (!list) return [];
  return list.map((option) => ({
    value: String(option.value ?? option.slug ?? ''),
    label: String(option.label ?? option.name ?? option.value ?? option.slug ?? ''),
  }));
}

async function loadFacets(): Promise<void> {
  const response = (await api.get('/booking/filters')) as { facets?: FacetDescriptor[] };
  facets.value = response.facets ?? [];
  await Promise.all(
    facets.value
      .filter((facet) => facet.options_endpoint)
      .map(async (facet) => {
        const endpoint = (facet.options_endpoint as string).replace(API_PREFIX, '');
        const optionsResponse = (await api.get(endpoint)) as Record<string, unknown>;
        resolvedOptions.value[facet.key] = mapOptions(optionsResponse);
      }),
  );
}

function buildResourcesUrl(): string {
  const params = filters.queryParams.value;
  const search = new URLSearchParams();
  search.set('page', String(params.page));
  search.set('per_page', String(params.per_page));
  if (params.q) search.set('q', params.q);
  if (params.tags && params.tags.length) search.set('tags', params.tags.join(','));
  for (const [key, value] of Object.entries(params)) {
    if (['page', 'per_page', 'q', 'tags'].includes(key)) continue;
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return `/booking/resources?${search.toString()}`;
}

async function loadResources(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const response = (await api.get(buildResourcesUrl())) as CatalogueEnvelope;
    items.value = response.items;
    pages.value = response.pages || 1;
  } catch (fetchError) {
    error.value = (fetchError as Error).message || 'Failed to load resources';
  } finally {
    loading.value = false;
  }
}

function onSearchInput(): void {
  filters.setQuery(searchMirror.value);
}

function onFacetChange(key: string, value: string): void {
  filters.setFacet(key, value);
}

function onTagToggle(slug: string): void {
  filters.toggleTag(slug);
}

function onRangeChange(key: string, range: { from: string; to: string }): void {
  filters.setDateRange(key, range.from, range.to);
}

onMounted(async () => {
  await loadFacets();
  await loadResources();
});

// The URL query is the single source of truth: any filter/pagination/date-range
// change (including back/forward) refetches resources and re-syncs the mirror.
watch(
  () => route.query,
  () => {
    searchMirror.value = filters.query.value;
    loadResources();
  },
  { deep: true },
);
</script>

<style scoped>
.booking-catalogue { max-width: 1100px; margin: 0 auto; padding: 20px; }
.booking-catalogue__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.booking-catalogue__title { font-size: 1.6rem; color: var(--vbwd-color-text, #2c3e50); margin: 0; }
.booking-catalogue__controls { display: flex; gap: 8px; align-items: center; }
.booking-catalogue__search { padding: 8px 12px; border: 1px solid var(--vbwd-border-color, #d1d5db); border-radius: 6px; font-size: 14px; width: 200px; }
.booking-catalogue__view-toggle { padding: 8px 12px; border: 1px solid var(--vbwd-border-color, #d1d5db); border-radius: 6px; background: var(--vbwd-color-surface, #fff); cursor: pointer; font-size: 18px; }

/* Grid & List */
.ghrm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-top: 20px; }
.ghrm-list { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
.ghrm-pkg-card { display: flex; flex-direction: column; gap: 8px; padding: 20px; background: var(--vbwd-color-surface, #fff); border: 1px solid var(--vbwd-border-color, #e9ecef); border-radius: 8px; text-decoration: none; transition: all .2s; }
.ghrm-pkg-card:hover { border-color: var(--vbwd-color-primary, #3498db); box-shadow: 0 2px 12px rgba(52,152,219,.1); }
.ghrm-pkg-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--vbwd-color-surface, #fff); border: 1px solid var(--vbwd-border-color, #e9ecef); border-radius: 6px; text-decoration: none; }
.ghrm-pkg-row:hover { background: var(--vbwd-bg-muted, #f0f7ff); }
.ghrm-pkg-icon { width: 40px; height: 40px; object-fit: contain; border-radius: 6px; }
.ghrm-pkg-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.ghrm-pkg-name { font-weight: 600; color: var(--vbwd-color-text, #2c3e50); font-size: 15px; }
.ghrm-pkg-author { font-size: 12px; color: var(--vbwd-text-secondary, #6b7280); text-transform: capitalize; }
.ghrm-pkg-description { font-size: 13px; color: var(--vbwd-text-secondary, #6b7280); margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.ghrm-pkg-downloads { font-size: 12px; color: var(--vbwd-text-secondary, #9ca3af); }

/* Booking-specific: price + meta */
.booking-card-meta { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px; }
.booking-price { font-weight: 600; color: var(--vbwd-color-primary, #3498db); font-size: 14px; }

/* Card tags (filter shortcuts) */
.booking-card-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.booking-card-tag { padding: 2px 8px; border: 1px solid var(--vbwd-border-color, #e9ecef); border-radius: 999px; background: var(--vbwd-bg-muted, #f8f9fa); color: var(--vbwd-text-secondary, #6b7280); cursor: pointer; font-size: 11px; }
.booking-card-tag--active { background: var(--vbwd-color-primary, #3498db); color: var(--vbwd-color-on-primary, #fff); border-color: var(--vbwd-color-primary, #3498db); }

/* States */
.ghrm-loading, .ghrm-empty { text-align: center; padding: 48px 20px; color: var(--vbwd-text-secondary, #6b7280); }

/* Pager */
.booking-catalogue__pager { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 24px; }
.booking-catalogue__pager button { padding: 6px 14px; border: 1px solid var(--vbwd-border-color, #d1d5db); border-radius: 4px; background: var(--vbwd-color-surface, #fff); color: var(--vbwd-color-text, #333); cursor: pointer; }
.booking-catalogue__pager button:disabled { opacity: 0.4; cursor: default; }
</style>
