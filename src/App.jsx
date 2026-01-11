import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import { translations } from './constants/translations'
import { useNews } from './hooks/useNews'
import { useCategories } from './hooks/useCategories'
import { getCombinedCategories, getAvailableCategories } from './utils/categoryCombiner'
import { filterNews, sortNews } from './utils/newsFilters'
import { Header } from './components/Header'
import { SubHeader } from './components/SubHeader'
import { NewsList } from './components/NewsList'
import { Settings } from './components/Settings'
import { TabNavigation } from './components/TabNavigation'
import { ToastProvider } from './contexts/ToastContext'
import { loadTabs, getActiveTabId, setActiveTabId, getTabFilters, saveTabFilters } from './utils/tabsStorage'

function App() {
  const [uiLanguage, setUiLanguage] = useState('en')
  const [newsFilter, setNewsFilter] = useState('all') // 'all', 'fr', 'en'
  const [selectedCategories, setSelectedCategories] = useState(new Set())
  const [sortBy, setSortBy] = useState('date') // 'date' or 'popularity'
  const [showHighlyRated, setShowHighlyRated] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [activeTabId, setActiveTabIdState] = useState(null)
  const [tabs, setTabs] = useState([])

  // Load tabs on mount and read active tab from URL or localStorage
  useEffect(() => {
    const loadedTabs = loadTabs()
    setTabs(loadedTabs)
    
    // Try to get active tab from URL query string first
    const urlParams = new URLSearchParams(window.location.search)
    const tabIdFromUrl = urlParams.get('tab')
    
    let currentActiveTabId = null
    
    // If tab ID in URL, validate it exists in loaded tabs
    if (tabIdFromUrl && loadedTabs.find(t => t.id === tabIdFromUrl)) {
      currentActiveTabId = tabIdFromUrl
    } else {
      // Fallback to localStorage (with validation)
      currentActiveTabId = getActiveTabId(loadedTabs)
      if (!currentActiveTabId) {
        currentActiveTabId = loadedTabs[0]?.id || null
      }
      
      // Update URL if we're using a different tab than what's in the URL
      if (currentActiveTabId && tabIdFromUrl !== currentActiveTabId) {
        const url = new URL(window.location.href)
        url.searchParams.set('tab', currentActiveTabId)
        window.history.replaceState({}, '', url.toString())
      }
    }
    
    if (currentActiveTabId) {
      setActiveTabId(currentActiveTabId)
      setActiveTabIdState(currentActiveTabId)
    }
    
    // Load filters for active tab
    if (currentActiveTabId) {
      const savedFilters = getTabFilters(currentActiveTabId)
      if (savedFilters) {
        setNewsFilter(savedFilters.newsFilter || 'all')
        setSelectedCategories(new Set(savedFilters.selectedCategories || []))
        setSortBy(savedFilters.sortBy || 'date')
        setShowHighlyRated(savedFilters.showHighlyRated || false)
        setSearchQuery(savedFilters.searchQuery || '')
      }
    }
  }, [])
  
  // Helper function to update URL with tab ID
  const updateUrlWithTab = useCallback((tabId) => {
    const url = new URL(window.location.href)
    if (tabId) {
      url.searchParams.set('tab', tabId)
    } else {
      url.searchParams.delete('tab')
    }
    // Update URL without page reload
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Save filters when they change (per tab)
  useEffect(() => {
    if (activeTabId) {
      saveTabFilters(activeTabId, {
        newsFilter,
        selectedCategories: Array.from(selectedCategories),
        sortBy,
        showHighlyRated,
        searchQuery
      })
    }
  }, [activeTabId, newsFilter, selectedCategories, sortBy, showHighlyRated, searchQuery])

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTabIdState(tabId)
    setActiveTabId(tabId)
    
    // Update URL with new tab ID
    updateUrlWithTab(tabId)
    
    // Load filters for the new tab
    const savedFilters = getTabFilters(tabId)
    if (savedFilters) {
      setNewsFilter(savedFilters.newsFilter || 'all')
      setSelectedCategories(new Set(savedFilters.selectedCategories || []))
      setSortBy(savedFilters.sortBy || 'date')
      setShowHighlyRated(savedFilters.showHighlyRated || false)
      setSearchQuery(savedFilters.searchQuery || '')
    } else {
      // Reset to defaults if no saved filters
      setNewsFilter('all')
      setSelectedCategories(new Set())
      setSortBy('date')
      setShowHighlyRated(false)
      setSearchQuery('')
    }
    
    // Force refresh news for the new tab
    // The useNews hook will automatically re-fetch when tabId changes
  }

  // Custom hooks - pass active tab sources and tabId to useNews
  const activeTab = tabs.find(t => t.id === activeTabId)
  const tabSources = activeTab?.sources || []
  const { news, loading, error, isInitialLoad, newItemIds, fetchNews, refreshNews } = useNews(tabSources, activeTabId)
  const categories = useCategories(news)

  // Detect browser language on mount
  useEffect(() => {
    const browserLang = navigator.language || navigator.userLanguage
    const detectedLang = browserLang.startsWith('fr') ? 'fr' : 'en'
    setUiLanguage(detectedLang)
  }, [])

  // Auto-refresh every 5 minutes
  const fetchNewsRef = useRef(fetchNews)
  fetchNewsRef.current = fetchNews

  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      fetchNewsRef.current(false, false) // Background refresh
    }, 5 * 60 * 1000) // 5 minutes
    
    return () => clearInterval(interval)
  }, [autoRefresh])

  // Get combined categories
  const combinedCategories = getCombinedCategories(categories)

  // Filter and sort news
  const filters = {
    newsFilter,
    showHighlyRated,
    searchQuery,
    selectedCategories
  }
  
  const filteredNews = filterNews(news, filters, combinedCategories)
  const sortedNews = sortNews(filteredNews, sortBy)

  // Get available categories (only those with matching articles)
  const availableCategories = getAvailableCategories(news, combinedCategories, filters)

  // Toggle category selection
  const toggleCategory = (categoryName) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName)
      } else {
        newSet.add(categoryName)
      }
      return newSet
    })
  }

  // Clear all categories
  const clearCategories = () => {
    setSelectedCategories(new Set())
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSelectedCategories(new Set())
    setNewsFilter('all')
    setShowHighlyRated(false)
    setSearchQuery('')
    setSortBy('date')
  }

  const t = translations[uiLanguage]

  // Show Settings as full page
  if (showSettings) {
    return (
      <ToastProvider>
        <div className="app">
          <Header 
            uiLanguage={uiLanguage}
            onLanguageToggle={() => setUiLanguage(uiLanguage === 'fr' ? 'en' : 'fr')}
            onSettingsClick={() => setShowSettings(false)}
            showArticleCount={false}
            isSettingsPage={true}
          />
          <Settings
            uiLanguage={uiLanguage}
            onClose={() => setShowSettings(false)}
          />
        </div>
      </ToastProvider>
    )
  }

  // Main News Feed page
  return (
    <ToastProvider>
      <div className="app">
        <Header 
          uiLanguage={uiLanguage}
          onLanguageToggle={() => setUiLanguage(uiLanguage === 'fr' ? 'en' : 'fr')}
          articleCount={sortedNews.length}
          totalCount={news.length}
          onSettingsClick={() => setShowSettings(true)}
          showArticleCount={true}
          isSettingsPage={false}
        />
        {tabs.length > 1 && (
          <TabNavigation 
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={handleTabChange}
            uiLanguage={uiLanguage}
          />
        )}
        <SubHeader
          uiLanguage={uiLanguage}
          newsFilter={newsFilter}
          onNewsFilterChange={setNewsFilter}
          selectedCategories={selectedCategories}
          availableCategories={availableCategories}
          onToggleCategory={toggleCategory}
          onClearCategories={clearCategories}
          onClearAllFilters={clearAllFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          showHighlyRated={showHighlyRated}
          onHighlyRatedToggle={() => setShowHighlyRated(!showHighlyRated)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={refreshNews}
          loading={loading}
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
        />

        <main className="main">
          <NewsList
            news={sortedNews}
            uiLanguage={uiLanguage}
            loading={loading}
            isInitialLoad={isInitialLoad}
            error={error}
            newItemIds={newItemIds}
            combinedCategories={combinedCategories}
            onCategoryClick={toggleCategory}
          />
        </main>
      </div>
    </ToastProvider>
  )
}

export default App
