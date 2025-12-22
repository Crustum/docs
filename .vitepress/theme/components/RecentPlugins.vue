<template>
  <div class="VPFeatures VPHomeFeatures">
    <div class="features-header">
      <h2 class="features-title">Plugins</h2>
      <a :href="getPluginsIndexPath()" class="view-all-link">View All Plugins →</a>
    </div>
    <div v-if="loading" class="loading">Loading plugins...</div>
    <div v-else-if="plugins.length === 0" class="no-plugins">
      <p>No plugins found.</p>
    </div>
    <div v-else class="container">
      <div class="items">
        <div v-for="plugin in plugins" :key="plugin.slug" class="item grid-4">
          <a :href="getPluginPath(plugin.path)" class="VPLink link no-icon VPFeature">
            <article class="box">
              <h2 class="title">{{ plugin.title }}</h2>
              <p class="details">{{ plugin.description }}</p>
            </article>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useData } from 'vitepress'

const { site } = useData()
const plugins = ref([])
const loading = ref(true)

onMounted(() => {
  loadRecentPlugins()
})

const loadRecentPlugins = async () => {
  try {
    const base = site.value.base
    const metadataPath = `${base}recent-plugins.json`.replace(/\/+/g, '/')
    const response = await fetch(metadataPath)

    if (response.ok) {
      const loadedPlugins = await response.json()
      plugins.value = loadedPlugins
    } else {
      console.warn('Could not load recent plugins metadata, status:', response.status)
      plugins.value = []
    }
  } catch (error) {
    console.error('Error loading recent plugins:', error)
    plugins.value = []
  } finally {
    loading.value = false
  }
}

const getPluginPath = (path) => {
  const base = site.value.base
  return `${base}${path}`.replace(/\/+/g, '/')
}

const getPluginsIndexPath = () => {
  const base = site.value.base
  return `${base}plugins/`.replace(/\/+/g, '/')
}
</script>

<style scoped>
.features-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.features-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin: 0;
}

.view-all-link {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.2s;
}

.view-all-link:hover {
  color: var(--vp-c-brand-2);
}

.loading,
.no-plugins {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--vp-c-text-2);
}

@media (max-width: 768px) {
  .features-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>

