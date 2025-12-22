import DefaultTheme from 'vitepress/theme-without-fonts'
import Layout from './Layout.vue'
import DynamicGitHubLink from './components/DynamicGitHubLink.vue'
import PluginsList from './components/PluginsList.vue'
import RecentPlugins from './components/RecentPlugins.vue'
import codeblocksFold from 'vitepress-plugin-codeblocks-fold'
import 'vitepress-plugin-codeblocks-fold/style/index.css'
import { useData, useRoute } from 'vitepress'
import { CODEBLOCK_FOLD_THRESHOLD } from '../constants.js'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, router, siteData }) {
    app.component('DynamicGitHubLink', DynamicGitHubLink)
    app.component('PluginsList', PluginsList)
    app.component('RecentPlugins', RecentPlugins)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        if (window.renderMermaidDiagrams) {
          const unprocessedMermaid = document.querySelectorAll('.mermaid:not([data-processed])');
          if (unprocessedMermaid.length > 0) {
            window.renderMermaidDiagrams();
          }
        }
      }, 100);
    }
  },
  setup() {
    const { frontmatter } = useData()
    const route = useRoute()
    // Makes all code blocks collapsible
    // Parameters: (context, defaultAllFold, collapsedHeight)
    // - defaultAllFold: false = start expanded, true = start collapsed (default: true)
    // - collapsedHeight: height in pixels when collapsed (default: 400px)
    codeblocksFold({ route, frontmatter }, true, 350)
  }
}