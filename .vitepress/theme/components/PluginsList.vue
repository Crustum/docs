<template>
  <div class="plugins-list">
    <div v-if="loading" class="loading">Loading plugins...</div>
    <div v-else-if="plugins.length === 0" class="no-plugins">
      <p>No plugins found.</p>
    </div>
    <div v-else>
      <div class="plugins-grid">
        <article
          v-for="plugin in paginatedPlugins"
          :key="plugin.slug"
          class="plugin-card"
        >
          <h2 class="plugin-title">
            <a :href="getPluginPath(plugin.path)">{{ plugin.title }}</a>
          </h2>
          <p class="plugin-description">{{ plugin.description }}</p>
          <a :href="getPluginPath(plugin.path)" class="plugin-link">View plugin →</a>
        </article>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          ← Previous
        </button>
        <span class="pagination-info">
          Page {{ currentPage }} of {{ totalPages }}
        </span>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          Next →
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter, useData } from 'vitepress'

const route = useRoute()
const router = useRouter()
const { site } = useData()

const plugins = ref([])
const loading = ref(true)
const itemsPerPage = ref(12)
const currentPage = ref(1)

// Get page from query parameter
onMounted(() => {
  const pageParam = route.query.page
  if (pageParam) {
    currentPage.value = parseInt(pageParam) || 1
  }
  loadPlugins()
})

const loadPlugins = async () => {
  try {
    const base = site.value.base
    const metadataPath = `${base}plugins-metadata.json`.replace(/\/+/g, '/')
    const response = await fetch(metadataPath)

    if (response.ok) {
      const loadedPlugins = await response.json()
      // Sort alphabetically - show ALL plugins with pagination
      plugins.value = loadedPlugins.sort((a, b) => a.title.localeCompare(b.title))
    } else {
      console.warn('Could not load plugins metadata')
      plugins.value = []
    }
  } catch (error) {
    console.error('Error loading plugins:', error)
    plugins.value = []
  } finally {
    loading.value = false
  }
}

const totalPages = computed(() => {
  return Math.ceil(plugins.value.length / itemsPerPage.value)
})

const paginatedPlugins = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return plugins.value.slice(start, end)
})

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    const url = new URL(window.location)
    if (page === 1) {
      url.searchParams.delete('page')
    } else {
      url.searchParams.set('page', page.toString())
    }
    window.history.pushState({}, '', url)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const getPluginPath = (path) => {
  const base = site.value.base
  return `${base}${path}`.replace(/\/+/g, '/')
}
</script>

<style scoped>
.plugins-list {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.loading,
.no-plugins {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--vp-c-text-2);
}

.plugins-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.plugin-card {
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 1.5rem;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid var(--vp-c-divider);
}

.plugin-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.plugin-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.plugin-title a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  transition: color 0.2s;
}

.plugin-title a:hover {
  color: var(--vp-c-brand-2);
}

.plugin-description {
  margin: 0 0 1rem 0;
  color: var(--vp-c-text-1);
  line-height: 1.6;
}

.plugin-link {
  display: inline-block;
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.plugin-link:hover {
  color: var(--vp-c-brand-2);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-top: 3rem;
  padding: 1rem;
}

.pagination-btn {
  padding: 0.5rem 1rem;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.pagination-btn:hover:not(:disabled) {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}
</style>

