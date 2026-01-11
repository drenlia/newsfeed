// Utilities for storing settings preferences (like selected country filters)
const SETTINGS_STORAGE_KEY = 'newsfeed-settings-preferences'

export const loadSettingsPreferences = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        selectedCountries: new Set(parsed.selectedCountries || []),
        // Add other preferences here as needed
      }
    }
  } catch (error) {
    console.warn('Failed to load settings preferences:', error)
  }
  
  return {
    selectedCountries: new Set(),
  }
}

export const saveSettingsPreferences = (preferences) => {
  try {
    const toStore = {
      selectedCountries: Array.from(preferences.selectedCountries),
    }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(toStore))
    return true
  } catch (error) {
    console.error('Failed to save settings preferences:', error)
    return false
  }
}
