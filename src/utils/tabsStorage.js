// Utilities for managing tabs configuration

const TABS_KEY = 'newsfeed-tabs'
const ACTIVE_TAB_KEY = 'newsfeed-active-tab'
const TAB_FILTERS_KEY = 'newsfeed-tab-filters'

// Default tab structure
export const createDefaultTab = () => ({
  id: `tab-${Date.now()}`,
  name: 'Default',
  sources: []
})

// Load tabs from localStorage
export const loadTabs = () => {
  try {
    const stored = localStorage.getItem(TABS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (error) {
    console.warn('Failed to load tabs from localStorage:', error)
  }
  
  // Return default tab - migrate existing sources if available
  try {
    const { loadNewsConfig } = require('./newsConfigUtils')
    const existingConfig = loadNewsConfig()
    if (existingConfig && existingConfig.sources && existingConfig.sources.length > 0) {
      // Migrate existing sources to default tab
      const defaultTab = createDefaultTab()
      defaultTab.sources = existingConfig.sources
      const tabs = [defaultTab]
      saveTabs(tabs) // Save migrated tabs
      return tabs
    }
  } catch (error) {
    console.warn('Failed to migrate existing config to tabs:', error)
  }
  
  // Return default tab with empty sources
  return [createDefaultTab()]
}

// Save tabs to localStorage
export const saveTabs = (tabs) => {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs))
    return true
  } catch (error) {
    console.error('Failed to save tabs to localStorage:', error)
    return false
  }
}

// Get active tab ID (optionally validate against tabs array)
export const getActiveTabId = (tabs = null) => {
  try {
    const stored = localStorage.getItem(ACTIVE_TAB_KEY)
    if (stored) {
      // If tabs array provided, validate the stored ID exists
      if (tabs && Array.isArray(tabs)) {
        if (tabs.find(t => t.id === stored)) {
          return stored
        }
        // Stored ID doesn't exist in tabs, return null
        return null
      }
      return stored
    }
  } catch (error) {
    console.warn('Failed to load active tab from localStorage:', error)
  }
  return null
}

// Set active tab ID
export const setActiveTabId = (tabId) => {
  try {
    localStorage.setItem(ACTIVE_TAB_KEY, tabId)
    return true
  } catch (error) {
    console.error('Failed to save active tab to localStorage:', error)
    return false
  }
}

// Get filters for a specific tab
export const getTabFilters = (tabId) => {
  try {
    const stored = localStorage.getItem(TAB_FILTERS_KEY)
    if (stored) {
      const filters = JSON.parse(stored)
      return filters[tabId] || null
    }
  } catch (error) {
    console.warn('Failed to load tab filters from localStorage:', error)
  }
  return null
}

// Save filters for a specific tab
export const saveTabFilters = (tabId, filters) => {
  try {
    const stored = localStorage.getItem(TAB_FILTERS_KEY)
    const allFilters = stored ? JSON.parse(stored) : {}
    allFilters[tabId] = filters
    localStorage.setItem(TAB_FILTERS_KEY, JSON.stringify(allFilters))
    return true
  } catch (error) {
    console.error('Failed to save tab filters to localStorage:', error)
    return false
  }
}

// Create a new tab with a default name
export const createNewTab = (existingTabs) => {
  const tabNumber = existingTabs.length + 1
  return {
    id: `tab-${Date.now()}`,
    name: `Tab ${tabNumber}`,
    sources: []
  }
}

// Delete a tab (ensures at least one remains)
export const deleteTab = (tabs, tabId) => {
  if (tabs.length <= 1) {
    return tabs // Can't delete the last tab
  }
  return tabs.filter(tab => tab.id !== tabId)
}

// Update tab name
export const updateTabName = (tabs, tabId, newName) => {
  return tabs.map(tab => 
    tab.id === tabId ? { ...tab, name: newName.trim() || tab.name } : tab
  )
}

// Update tab sources
export const updateTabSources = (tabs, tabId, sources) => {
  return tabs.map(tab => 
    tab.id === tabId ? { ...tab, sources } : tab
  )
}

// Reorder tabs
export const reorderTabs = (tabs, fromIndex, toIndex) => {
  const newTabs = [...tabs]
  const [removed] = newTabs.splice(fromIndex, 1)
  newTabs.splice(toIndex, 0, removed)
  return newTabs
}
