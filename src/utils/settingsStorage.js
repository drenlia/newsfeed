// Utilities for storing settings preferences (like selected country filters)
const SETTINGS_STORAGE_KEY = 'newsfeed-settings-preferences'

export const loadSettingsPreferences = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        selectedCountries: new Set(parsed.selectedCountries || []),
        subheaderCollapsed: parsed.subheaderCollapsed || false,
        showToastMessages: parsed.showToastMessages !== undefined ? parsed.showToastMessages : true,
        // Add other preferences here as needed
      }
    }
  } catch (error) {
    console.warn('Failed to load settings preferences:', error)
  }
  
  return {
    selectedCountries: new Set(),
    subheaderCollapsed: false,
    showToastMessages: true, // Default to showing toast messages
  }
}

export const saveSettingsPreferences = (preferences) => {
  try {
    const stored = loadSettingsPreferences()
    const toStore = {
      selectedCountries: preferences.selectedCountries 
        ? Array.from(preferences.selectedCountries) 
        : (stored.selectedCountries instanceof Set ? Array.from(stored.selectedCountries) : stored.selectedCountries),
      subheaderCollapsed: preferences.subheaderCollapsed !== undefined 
        ? preferences.subheaderCollapsed 
        : stored.subheaderCollapsed,
      showToastMessages: preferences.showToastMessages !== undefined 
        ? preferences.showToastMessages 
        : stored.showToastMessages,
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toStore))
    return true
  } catch (error) {
    console.error('Failed to save settings preferences:', error)
    return false
  }
}
