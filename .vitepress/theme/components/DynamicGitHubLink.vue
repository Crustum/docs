<template>
  <div class="dynamic-github-links">
    <a
      v-if="currentPluginRepo"
      :href="currentPluginRepo"
      target="_blank"
      rel="noopener noreferrer"
      class="github-link"
      :title="`View ${currentPluginName} on GitHub`"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
      <span class="github-text">{{ currentPluginName }}</span>
    </a>
    <a
      v-else
      href="https://github.com/crustum"
      target="_blank"
      rel="noopener noreferrer"
      class="github-link"
      title="View Profile on GitHub"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
      <span class="github-text">GitHub</span>
    </a>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useData } from 'vitepress'

const route = useRoute()
const { site } = useData()

const pluginRepos = {
  'BatchQueue': 'https://github.com/crustum/batch-queue',
  'Broadcasting': 'https://github.com/Crustum/Broadcasting',
  'BroadcastingNotification': 'https://github.com/Crustum/BroadcastingNotification',
  'Notification': 'https://github.com/Crustum/Notification',
  'NotificationUI': 'https://github.com/Crustum/NotificationUI',
  'OpenRouter': 'https://github.com/crustum/open-router',
  'PluginManifest': 'https://github.com/crustum/plugin-manifest',
  'RocketChatNotification': 'https://github.com/Crustum/RocketchatNotification',
  'SevenNotification': 'https://github.com/Crustum/SevenNotification',
  'SlackNotification': 'https://github.com/Crustum/SlackNotification',
  'TelegramNotification': 'https://github.com/Crustum/TelegramNotification',
  'Temporal': 'https://github.com/crustum/cakephp-temporal'
}

const currentPluginName = computed(() => {
  const path = route.path
  const basePath = '/docs'
  const normalizedPath = basePath !== '/' ? path.replace(basePath.replace(/\/$/, ''), '') : path

  for (const plugin in pluginRepos) {
    if (normalizedPath.startsWith(`/${plugin}/`)) {
      return plugin
    }
  }
  return null
})

const currentPluginRepo = computed(() => {
  return currentPluginName.value ? pluginRepos[currentPluginName.value] : null
})
</script>

<style scoped>
.dynamic-github-links {
  display: flex;
  align-items: center;
}

.github-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-text-2);
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.github-link:hover {
  color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-soft);
}

.github-text {
  white-space: nowrap;
}

@media (max-width: 768px) {
  .github-text {
    display: none;
  }
}
</style>
