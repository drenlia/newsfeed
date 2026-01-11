import { useState, useEffect, useRef } from 'react'
import { translations } from '../constants/translations'
import { searchSources, getAllSources, getAllCountries } from '../services/sourceSearchService'
import { 
  loadNewsConfig, 
  saveNewsConfig, 
  exportConfig,
  importConfig
} from '../utils/newsConfigUtils'
import { loadSettingsPreferences, saveSettingsPreferences } from '../utils/settingsStorage'
import { clearCachedNews } from '../utils/storageUtils'
import { validateRssFeed } from '../utils/rssValidator'
import { useToastContext } from '../contexts/ToastContext'
import {
  loadTabs,
  saveTabs,
  createNewTab,
  deleteTab,
  updateTabName,
  updateTabSources,
  reorderTabs,
  getActiveTabId,
  setActiveTabId
} from '../utils/tabsStorage'

export const Settings = ({ uiLanguage, onClose }) => {
  const t = translations[uiLanguage]
  const [tabs, setTabs] = useState([])
  const [activeTabId, setActiveTabIdState] = useState(null)
  const [editingTabName, setEditingTabName] = useState(null)
  const [editingTabNameValue, setEditingTabNameValue] = useState('')
  const [draggedTabIndex, setDraggedTabIndex] = useState(null)
  const [config, setConfig] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedSources, setSelectedSources] = useState(new Set())
  const [selectedCountries, setSelectedCountries] = useState(new Set())
  const [availableCountries, setAvailableCountries] = useState([])
  const searchTimeoutRef = useRef(null)
  const { success, error: showError, warning } = useToastContext()
  
  // Manual RSS feed state
  const [manualFeedUrl, setManualFeedUrl] = useState('')
  const [validatingFeed, setValidatingFeed] = useState(false)
  const [feedValidationResult, setFeedValidationResult] = useState(null)

  // Load tabs and configuration on mount
  useEffect(() => {
    // Load tabs
    const loadedTabs = loadTabs()
    setTabs(loadedTabs)
    
    // Load active tab ID or use first tab
    let currentActiveTabId = getActiveTabId()
    if (!currentActiveTabId || !loadedTabs.find(t => t.id === currentActiveTabId)) {
      currentActiveTabId = loadedTabs[0]?.id || null
      if (currentActiveTabId) {
        setActiveTabId(currentActiveTabId)
      }
    }
    setActiveTabIdState(currentActiveTabId)
    
    // Load sources for active tab
    const activeTab = loadedTabs.find(t => t.id === currentActiveTabId)
    const tabSources = activeTab?.sources || []
    
    // Create config from tab sources
    const loadedConfig = { sources: tabSources }
    setConfig(loadedConfig)
    
    // Load country filters from storage
    const preferences = loadSettingsPreferences()
    setSelectedCountries(preferences.selectedCountries)
    
    // Load available countries
    const countries = getAllCountries()
    setAvailableCountries(countries)
    
    // Load initial available sources (filtered by countries if any selected)
    const initialSources = getAllSources(50, preferences.selectedCountries.size > 0 ? preferences.selectedCountries : null)
    setSearchResults(initialSources)
  }, [])
  
  // Update config when active tab changes
  useEffect(() => {
    if (activeTabId && tabs.length > 0) {
      const activeTab = tabs.find(t => t.id === activeTabId)
      if (activeTab) {
        const tabConfig = { sources: activeTab.sources || [] }
        setConfig(tabConfig)
        setSelectedSources(new Set()) // Clear selection when switching tabs
      }
    }
  }, [activeTabId, tabs])

  // Handle search with debounce and country filters
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    const applyFilters = () => {
      const countryFilters = selectedCountries.size > 0 ? selectedCountries : null

      if (searchQuery.trim().length === 0) {
        // Show initial sources when no search (filtered by countries)
        setSearchResults(getAllSources(50, countryFilters))
        return
      }

      if (searchQuery.trim().length < 1) {
        setSearchResults([])
        return
      }

      const results = searchSources(searchQuery, countryFilters)
      setSearchResults(results)
    }

    searchTimeoutRef.current = setTimeout(applyFilters, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, selectedCountries])

  // Get active source URLs for current tab
  const activeSourceUrls = config ? new Set(config.sources.map(s => s.url)) : new Set()
  
  // Get active tab
  const activeTab = tabs.find(t => t.id === activeTabId)

  // Toggle source selection
  const toggleSourceSelection = (sourceUrl) => {
    setSelectedSources(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sourceUrl)) {
        newSet.delete(sourceUrl)
      } else {
        newSet.add(sourceUrl)
      }
      return newSet
    })
  }

  // Select/Deselect all visible results
  const toggleSelectAll = () => {
    if (selectedSources.size === searchResults.length) {
      setSelectedSources(new Set())
    } else {
      setSelectedSources(new Set(searchResults.map(r => r.url)))
    }
  }

  // Toggle country filter
  const toggleCountryFilter = (countryCode) => {
    setSelectedCountries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(countryCode)) {
        newSet.delete(countryCode)
      } else {
        newSet.add(countryCode)
      }
      
      // Save to localStorage
      saveSettingsPreferences({ selectedCountries: newSet })
      
      return newSet
    })
  }

  // Clear all country filters
  const clearCountryFilters = () => {
    setSelectedCountries(new Set())
    saveSettingsPreferences({ selectedCountries: new Set() })
  }

  // Add selected sources to active tab
  const handleAddSelected = () => {
    if (selectedSources.size === 0 || !activeTabId) return

    const sourcesToAdd = searchResults
      .filter(r => selectedSources.has(r.url))
      .filter(r => !activeSourceUrls.has(r.url)) // Don't add duplicates
      .map(r => ({
        name: r.name,
        url: r.url,
        language: r.language,
        region: r.region || '',
        country: r.country || '',
        province: r.province || ''
      }))

      if (sourcesToAdd.length === 0) {
        warning('Selected sources are already active')
        return
      }

    const updatedSources = [...config.sources, ...sourcesToAdd]
    const updatedTabs = updateTabSources(tabs, activeTabId, updatedSources)
    setTabs(updatedTabs)
    saveTabs(updatedTabs)
    
    const updatedConfig = { ...config, sources: updatedSources }
    setConfig(updatedConfig)
    clearCachedNews(activeTabId) // Clear cache for this tab to force fresh fetch
    setSelectedSources(new Set())
    success(`Added ${sourcesToAdd.length} source(s)`)
  }

  // Remove selected sources from active tab
  const handleRemoveSelected = () => {
    if (selectedSources.size === 0 || !activeTabId) return

    const updatedSources = config.sources.filter(s => !selectedSources.has(s.url))
    const updatedTabs = updateTabSources(tabs, activeTabId, updatedSources)
    setTabs(updatedTabs)
    saveTabs(updatedTabs)
    
    const updatedConfig = { ...config, sources: updatedSources }
    setConfig(updatedConfig)
    clearCachedNews(activeTabId) // Clear cache for this tab when removing sources
    setSelectedSources(new Set())
    success(`Removed ${config.sources.length - updatedSources.length} source(s)`)
  }

  // Toggle individual source (add/remove) for active tab
  const handleToggleSource = (source) => {
    if (!activeTabId) return
    
    const isActive = activeSourceUrls.has(source.url)
    
    if (isActive) {
      // Remove source - clear cache to remove articles from this source
      const updatedSources = config.sources.filter(s => s.url !== source.url)
      const updatedTabs = updateTabSources(tabs, activeTabId, updatedSources)
      setTabs(updatedTabs)
      saveTabs(updatedTabs)
      
      const updatedConfig = { ...config, sources: updatedSources }
      setConfig(updatedConfig)
      clearCachedNews(activeTabId) // Clear cache for this tab when removing sources
      success('Source removed')
    } else {
      // Add source
      const newSource = {
        name: source.name,
        url: source.url,
        language: source.language,
        region: source.region || '',
        country: source.country || '',
        province: source.province || ''
      }
      const updatedSources = [...config.sources, newSource]
      const updatedTabs = updateTabSources(tabs, activeTabId, updatedSources)
      setTabs(updatedTabs)
      saveTabs(updatedTabs)
      
      const updatedConfig = { ...config, sources: updatedSources }
      setConfig(updatedConfig)
      clearCachedNews(activeTabId) // Clear cache for this tab to force fresh fetch
      success('Source added')
    }
  }

  // Remove single source from active tab
  const handleRemoveSource = (sourceUrl) => {
    if (!activeTabId) return
    
    const updatedSources = config.sources.filter(s => s.url !== sourceUrl)
    const updatedTabs = updateTabSources(tabs, activeTabId, updatedSources)
    setTabs(updatedTabs)
    saveTabs(updatedTabs)
    
    const updatedConfig = { ...config, sources: updatedSources }
    setConfig(updatedConfig)
    clearCachedNews(activeTabId) // Clear cache for this tab when removing sources
    success('Source removed')
  }

  const handleExport = () => {
    exportConfig(config)
    success('Configuration exported')
  }

  const handleImport = (event) => {
    const file = event.target.files[0]
    if (!file) return

    importConfig(file)
      .then(importedConfig => {
        setConfig(importedConfig)
        saveNewsConfig(importedConfig)
        success(t.configSaved)
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      })
      .catch(error => {
        showError(`Import failed: ${error.message}`)
      })
  }

  // Validate manual RSS feed
  const handleValidateFeed = async () => {
    if (!manualFeedUrl.trim()) return
    
    setValidatingFeed(true)
    setFeedValidationResult(null)
    
    try {
      const result = await validateRssFeed(manualFeedUrl.trim())
      setFeedValidationResult(result)
      if (!result.valid && result.errors && result.errors.length > 0) {
        showError(result.errors[0])
      }
    } catch (error) {
      const errorResult = {
        valid: false,
        errors: [`Validation error: ${error.message}`],
        warnings: []
      }
      setFeedValidationResult(errorResult)
      showError(`Validation error: ${error.message}`)
    } finally {
      setValidatingFeed(false)
    }
  }

  // Add validated feed to sources
  const handleAddValidatedFeed = () => {
    if (!feedValidationResult || !feedValidationResult.valid || !feedValidationResult.channel) {
      return
    }
    
    const feedUrl = manualFeedUrl.trim()
    
    // Check if feed already exists
    if (config.sources.some(s => s.url === feedUrl)) {
      showError('This feed is already in your sources')
      return
    }
    
    // Create new source from validated feed
    const newSource = {
      name: feedValidationResult.channel.title || 'Untitled Feed',
      url: feedUrl,
      language: feedValidationResult.channel.language || 'en',
      region: '', // Manual feeds don't have a region by default
      country: '', // Manual feeds don't have a country by default
      province: '' // Manual feeds don't have a province by default
    }
    
    if (!activeTabId) {
      showError('No active tab selected')
      return
    }
    
    const updatedSources = [...config.sources, newSource]
    const updatedTabs = updateTabSources(tabs, activeTabId, updatedSources)
    setTabs(updatedTabs)
    saveTabs(updatedTabs)
    
    const updatedConfig = { ...config, sources: updatedSources }
    setConfig(updatedConfig)
    clearCachedNews(activeTabId) // Clear cache for this tab to force fresh fetch
    success(t.feedAdded)
    
    // Clear form
    setManualFeedUrl('')
    setFeedValidationResult(null)
  }

  // Tab management functions
  const handleCreateTab = () => {
    const newTab = createNewTab(tabs)
    const updatedTabs = [...tabs, newTab]
    setTabs(updatedTabs)
    saveTabs(updatedTabs)
    setActiveTabIdState(newTab.id)
    setActiveTabId(newTab.id)
    setConfig({ sources: [] })
    success(`Created ${newTab.name}`)
  }

  const handleDeleteTab = (tabId) => {
    if (tabs.length <= 1) {
      warning('Cannot delete the last tab')
      return
    }
    
    const updatedTabs = deleteTab(tabs, tabId)
    setTabs(updatedTabs)
    saveTabs(updatedTabs)
    
    // Switch to first tab if deleted tab was active
    if (activeTabId === tabId) {
      const newActiveId = updatedTabs[0].id
      setActiveTabIdState(newActiveId)
      setActiveTabId(newActiveId)
    }
    
    success('Tab deleted')
  }

  const handleSwitchTab = (tabId) => {
    setActiveTabIdState(tabId)
    setActiveTabId(tabId)
  }

  const handleStartEditTabName = (tab) => {
    setEditingTabName(tab.id)
    setEditingTabNameValue(tab.name)
  }

  const handleSaveTabName = (tabId) => {
    if (editingTabNameValue.trim()) {
      const updatedTabs = updateTabName(tabs, tabId, editingTabNameValue.trim())
      setTabs(updatedTabs)
      saveTabs(updatedTabs)
      success('Tab name updated')
    }
    setEditingTabName(null)
    setEditingTabNameValue('')
  }

  const handleCancelEditTabName = () => {
    setEditingTabName(null)
    setEditingTabNameValue('')
  }

  // Drag and drop handlers
  const handleDragStart = (index) => {
    setDraggedTabIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedTabIndex === null || draggedTabIndex === index) return
    
    const newTabs = reorderTabs(tabs, draggedTabIndex, index)
    setTabs(newTabs)
    saveTabs(newTabs)
    setDraggedTabIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedTabIndex(null)
  }

  if (!config) {
    return <div className="settings-loading">{t.loading}</div>
  }

  const allSelected = searchResults.length > 0 && selectedSources.size === searchResults.length

  return (
    <div className="settings-page">
      {/* Tab Management Section - Only show when multiple tabs exist */}
      {tabs.length > 1 && (
        <div className="settings-tabs-section">
          <div className="tabs-header">
            <button className="create-tab-btn" onClick={handleCreateTab}>
              + {t.createTab}
            </button>
          </div>
          <div className="tabs-list">
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                className={`tab-item ${activeTabId === tab.id ? 'active' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => handleSwitchTab(tab.id)}
              >
                {editingTabName === tab.id ? (
                  <input
                    type="text"
                    className="tab-name-input"
                    value={editingTabNameValue}
                    onChange={(e) => setEditingTabNameValue(e.target.value)}
                    onBlur={() => handleSaveTabName(tab.id)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveTabName(tab.id)
                      } else if (e.key === 'Escape') {
                        handleCancelEditTabName()
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <>
                    <span
                      className="tab-name"
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        handleStartEditTabName(tab)
                      }}
                      title={t.editTabName}
                    >
                      {tab.name}
                    </span>
                    <button
                      className="delete-tab-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteTab(tab.id)
                      }}
                      title={t.deleteTab}
                    >
                        ×
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Create Tab Button - Show when only one tab exists */}
      {tabs.length === 1 && (
        <div className="settings-tabs-section">
          <div className="tabs-header">
            <button className="create-tab-btn" onClick={handleCreateTab}>
              + {t.createTab}
            </button>
          </div>
        </div>
      )}

      <div className="settings-layout">
        {/* Left Sidebar - Country Filters */}
        <aside className="settings-sidebar">
          <div className="sidebar-section">
            <h3>{t.filterByCountry}</h3>
            {selectedCountries.size > 0 && (
              <button 
                className="clear-country-filters-btn"
                onClick={clearCountryFilters}
              >
                {t.clearFilters}
              </button>
            )}
            <div className="country-pills-vertical">
              {availableCountries.map(country => {
                const isSelected = selectedCountries.has(country.code)
                return (
                  <button
                    key={country.code}
                    className={`country-pill-vertical ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleCountryFilter(country.code)}
                    title={`${country.name} (${country.count} sources)`}
                  >
                    <span className="country-name">{country.name}</span>
                    <span className="country-count">({country.count})</span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="settings-main">
          {/* Manual RSS Feed Input */}
          <div className="settings-section">
            <h2>{t.addManualFeed}</h2>
            <div className="manual-feed-container">
              <div className="manual-feed-input-group">
                <input
                  type="text"
                  className="manual-feed-input"
                  placeholder={t.enterFeedUrl}
                  value={manualFeedUrl}
                  onChange={(e) => {
                    setManualFeedUrl(e.target.value)
                    setFeedValidationResult(null) // Clear previous results
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && manualFeedUrl.trim()) {
                      handleValidateFeed()
                    }
                  }}
                />
                <button
                  className="validate-feed-btn"
                  onClick={handleValidateFeed}
                  disabled={!manualFeedUrl.trim() || validatingFeed}
                >
                  {validatingFeed ? t.validating : t.validateFeed}
                </button>
              </div>
              
              {feedValidationResult && (
                <div className={`feed-validation-result ${feedValidationResult.valid ? 'valid' : 'invalid'}`}>
                  {feedValidationResult.valid ? (
                    <div className="feed-validation-success">
                      <div className="validation-header">
                        <span className="validation-icon">✓</span>
                        <strong>{t.feedValid}</strong>
                      </div>
                      {feedValidationResult.channel && (
                        <div className="feed-channel-info">
                          <div className="feed-info-row">
                            <span className="feed-info-label">{t.feedTitle}:</span>
                            <span className="feed-info-value">{feedValidationResult.channel.title || 'N/A'}</span>
                          </div>
                          {feedValidationResult.channel.description && (
                            <div className="feed-info-row">
                              <span className="feed-info-label">{t.feedDescription}:</span>
                              <span className="feed-info-value">{feedValidationResult.channel.description}</span>
                            </div>
                          )}
                          <div className="feed-info-row">
                            <span className="feed-info-label">{t.feedLanguage}:</span>
                            <span className="feed-info-value">{feedValidationResult.channel.language || t.detectingLanguage}</span>
                          </div>
                          <div className="feed-info-row">
                            <span className="feed-info-label">{t.feedItemCount}:</span>
                            <span className="feed-info-value">{feedValidationResult.channel.itemCount || 0}</span>
                          </div>
                          <button
                            className="add-validated-feed-btn"
                            onClick={handleAddValidatedFeed}
                          >
                            {t.addSelected}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="feed-validation-error">
                      <div className="validation-header">
                        <span className="validation-icon">✗</span>
                        <strong>{t.feedInvalid}</strong>
                      </div>
                      {feedValidationResult.errors && feedValidationResult.errors.length > 0 && (
                        <div className="validation-errors">
                          <strong>{t.feedMissingFields}:</strong>
                          <ul>
                            {feedValidationResult.errors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {feedValidationResult.warnings && feedValidationResult.warnings.length > 0 && (
                        <div className="validation-warnings">
                          <strong>{t.feedWarnings}:</strong>
                          <ul>
                            {feedValidationResult.warnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {feedValidationResult.channel && (
                        <div className="feed-channel-info">
                          <div className="feed-info-row">
                            <span className="feed-info-label">{t.feedTitle}:</span>
                            <span className="feed-info-value">{feedValidationResult.channel.title || 'N/A'}</span>
                          </div>
                          {feedValidationResult.channel.description && (
                            <div className="feed-info-row">
                              <span className="feed-info-label">{t.feedDescription}:</span>
                              <span className="feed-info-value">{feedValidationResult.channel.description}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="settings-section">
            <h2>{t.searchSources}</h2>
            <div className="source-search-container">
              <input
                type="text"
                className="source-search-input"
                placeholder={t.searchSourcesPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchResults.length > 0 && (
                <div className="search-results-header">
                  <span>{t.showingResults} {searchResults.length} {t.results}</span>
                  <button 
                    className="select-all-btn"
                    onClick={toggleSelectAll}
                  >
                    {allSelected ? t.deselectAll : t.selectAll}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Two Column Layout: Available Sources | Enabled Sources */}
          <div className="sources-two-column">
            {/* Available Sources */}
            <div className="sources-column">
              <div className="column-header">
                <h3>{t.availableSources}</h3>
                {selectedSources.size > 0 && (
                  <button 
                    className="add-selected-btn"
                    onClick={handleAddSelected}
                  >
                    {t.addSelected} ({selectedSources.size})
                  </button>
                )}
              </div>
              <div className="sources-list-container">
                {searchResults.length === 0 ? (
                  <div className="no-results">{t.noResults}</div>
                ) : (
                  <div className="sources-list-compact">
                    {searchResults.map((source, idx) => {
                      const isActive = activeSourceUrls.has(source.url)
                      const isSelected = selectedSources.has(source.url)
                      
                      return (
                        <div 
                          key={idx} 
                          className={`source-item-compact ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                        >
                          <label className="source-checkbox-label-compact">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSourceSelection(source.url)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="source-info-compact">
                              <div className="source-name-row">
                                <span className="source-name">{source.name}</span>
                                {isActive && (
                                  <span className="active-badge">✓</span>
                                )}
                              </div>
                              <div className="source-meta-compact">
                                {source.region && (
                                  <span className="source-region">{source.region}</span>
                                )}
                                <span className="source-language">{source.language}</span>
                                <span className="source-type">{source.type}</span>
                              </div>
                            </div>
                          </label>
                          <button
                            className={`toggle-source-btn-compact ${isActive ? 'remove' : 'add'}`}
                            onClick={() => handleToggleSource(source)}
                            title={isActive ? t.disableSource : t.enableSource}
                          >
                            {isActive ? '−' : '+'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Enabled Sources */}
            <div className="sources-column">
              <div className="column-header">
                <h3>{t.activeSources} ({config.sources.length})</h3>
                {selectedSources.size > 0 && (
                  <button 
                    className="remove-selected-btn"
                    onClick={handleRemoveSelected}
                  >
                    {t.removeSelected} ({selectedSources.size})
                  </button>
                )}
              </div>
              <div className="sources-list-container">
                {config.sources.length === 0 ? (
                  <div className="no-results">No active sources</div>
                ) : (
                  <div className="sources-list-compact">
                    {config.sources.map((source, idx) => {
                      const isSelected = selectedSources.has(source.url)
                      return (
                        <div 
                          key={idx} 
                          className={`source-item-compact active ${isSelected ? 'selected' : ''}`}
                        >
                          <label className="source-checkbox-label-compact">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSourceSelection(source.url)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="source-info-compact">
                              <div className="source-name-row">
                                <span className="source-name">{source.name}</span>
                                <span className="active-badge">✓</span>
                              </div>
                              <div className="source-meta-compact">
                                {source.region && (
                                  <span className="source-region">{source.region}</span>
                                )}
                                <span className="source-language">{source.language}</span>
                              </div>
                              <div className="source-url-compact" title={source.url}>
                                {source.url.length > 50 ? `${source.url.substring(0, 50)}...` : source.url}
                              </div>
                            </div>
                          </label>
                          <button
                            className="toggle-source-btn-compact remove"
                            onClick={() => handleRemoveSource(source.url)}
                            title={t.removeSource}
                          >
                            ×
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Import/Export */}
          <div className="settings-section">
            <div className="config-actions">
              <button className="export-btn" onClick={handleExport}>
                {t.exportConfig}
              </button>
              <label className="import-btn">
                {t.importConfig}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
