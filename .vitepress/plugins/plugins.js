import { readFileSync } from 'fs'
import { join } from 'path'
import { pluginsConfig } from '../plugins-config.js'

/**
 * VitePress plugin to generate plugins metadata from config
 * @param {number} recentCount - Number of recent plugins to include in recent plugins file
 */
export function pluginsPlugin(recentCount = 6) {
  return {
    name: 'plugins-plugin',
    configureServer(server) {
      generatePluginsMetadata(recentCount)
    },
    buildStart() {
      generatePluginsMetadata(recentCount)
    }
  }
}

/**
 * Generate plugins metadata from plugins config
 * @param {number} recentCount - Number of recent plugins to include in recent plugins file (default: 6)
 * @returns {Array} Array of plugin metadata
 */
export function generatePluginsMetadata(recentCount = 6) {
  const fs = require('fs')

  try {
    // Convert pluginsConfig to metadata format
    const plugins = pluginsConfig.map(plugin => ({
      title: plugin.title,
      description: plugin.details,
      slug: plugin.name,
      path: plugin.link,
      name: plugin.name
    }))

    // For recent plugins, use original order (first N from config)
    const recentPlugins = plugins.slice(0, recentCount)

    // Sort alphabetically for full plugins list (used in plugins index page)
    const sortedPlugins = [...plugins].sort((a, b) => a.title.localeCompare(b.title))

    // Write metadata to JSON files
    const metadataPath = join(process.cwd(), '.vitepress', 'plugins-metadata.json')
    const publicMetadataPath = join(process.cwd(), 'docs', 'public', 'plugins-metadata.json')
    const recentMetadataPath = join(process.cwd(), 'docs', 'public', 'recent-plugins.json')

    // Ensure public directory exists
    const publicDir = join(process.cwd(), 'docs', 'public')
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    fs.writeFileSync(metadataPath, JSON.stringify(sortedPlugins, null, 2))
    fs.writeFileSync(publicMetadataPath, JSON.stringify(sortedPlugins, null, 2))
    fs.writeFileSync(recentMetadataPath, JSON.stringify(recentPlugins, null, 2))

    return plugins
  } catch (error) {
    console.warn('Error generating plugins metadata:', error.message)
    return []
  }
}

/**
 * Get plugins metadata (cached or generate if not exists)
 * @returns {Array} Array of plugin metadata
 */
export function getPluginsMetadata() {
  try {
    const metadataPath = join(process.cwd(), '.vitepress', 'plugins-metadata.json')
    const fs = require('fs')
    if (fs.existsSync(metadataPath)) {
      return JSON.parse(readFileSync(metadataPath, 'utf-8'))
    }
  } catch (error) {
    console.warn('Could not load plugins metadata:', error.message)
  }
  return generatePluginsMetadata()
}

/**
 * Get plugins config (for use in index.md)
 * @returns {Array} Array of plugin config for features section
 */
export function getPluginsConfig() {
  return pluginsConfig
}

