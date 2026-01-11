// Utilities for managing news configuration (stored in localStorage)
import newsSourcesDefault from '../news.json'

const CONFIG_KEY = 'newsfeed-config'

// Load configuration from localStorage or return default
export const loadNewsConfig = () => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Validate structure
      if (parsed && parsed.sources && Array.isArray(parsed.sources)) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Failed to load news config from localStorage:', error)
  }
  
  // Return default from news.json
  return newsSourcesDefault
}

// Save configuration to localStorage
export const saveNewsConfig = (config) => {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    return true
  } catch (error) {
    console.error('Failed to save news config to localStorage:', error)
    return false
  }
}

// Get unique cities from sources
export const getCitiesFromSources = (sources) => {
  const cities = new Set()
  sources.forEach(source => {
    if (source.region) {
      cities.add(source.region)
    }
  })
  return Array.from(cities).sort()
}

// Get sources for a specific city
export const getSourcesForCity = (sources, cityName) => {
  return sources.filter(source => 
    source.region && source.region.toLowerCase() === cityName.toLowerCase()
  )
}

// Remove sources for a city
export const removeSourcesForCity = (sources, cityName) => {
  return sources.filter(source => 
    !source.region || source.region.toLowerCase() !== cityName.toLowerCase()
  )
}

// Add sources for a city
export const addSourcesForCity = (sources, newSources) => {
  // Remove duplicates based on URL
  const existingUrls = new Set(sources.map(s => s.url))
  const uniqueNewSources = newSources.filter(s => !existingUrls.has(s.url))
  
  return [...sources, ...uniqueNewSources]
}

// Export configuration as JSON (for download)
export const exportConfig = (config) => {
  const dataStr = JSON.stringify(config, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'news-config.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Import configuration from JSON file
export const importConfig = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result)
        if (config && config.sources && Array.isArray(config.sources)) {
          resolve(config)
        } else {
          reject(new Error('Invalid configuration format'))
        }
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
