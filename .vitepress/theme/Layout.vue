<template>
  <Layout>
    <template #nav-bar-content-after>
      <DynamicGitHubLink />
    </template>
    <template #home-features-before>
      <div class="home-content-wrapper">
        <div class="home-plugins-column">
          <RecentPlugins />
        </div>
      </div>
    </template>
  </Layout>
</template>

<script setup>
import DefaultTheme from 'vitepress/theme-without-fonts'
import DynamicGitHubLink from './components/DynamicGitHubLink.vue'
import RecentPlugins from './components/RecentPlugins.vue'

const { Layout } = DefaultTheme
</script>
