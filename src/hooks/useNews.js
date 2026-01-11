import { useState, useEffect, useRef, useCallback } from 'react'
import { loadNewsConfig } from '../utils/newsConfigUtils'
import { fetchRssFeed } from '../services/rssService'
import { loadCachedNews, saveNewsToCache } from '../utils/storageUtils'
import { calculatePopularityScores } from '../utils/popularityUtils'

export const useNews = (tabSources = null, tabId = null) => {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [newItemIds, setNewItemIds] = useState(new Set())
  const previousNewsIdsRef = useRef(new Set())
  
  // Use refs to track current tab sources and tabId to avoid stale closures
  const tabSourcesRef = useRef(tabSources)
  const tabIdRef = useRef(tabId)
  // Track which tab a fetch is for, to ignore results from wrong tab
  const fetchTabIdRef = useRef(tabId)
  
  // Update refs when props change
  useEffect(() => {
    tabSourcesRef.current = tabSources
    tabIdRef.current = tabId
    fetchTabIdRef.current = tabId // Update fetch tracking when tab changes
  }, [tabSources, tabId])

  // Define fetchNewsInternal first - uses refs to get current values
  const fetchNewsInternal = useCallback(async (useCache = true, forceRefresh = false) => {
    // Get current values from refs to avoid stale closures
    const currentTabSources = tabSourcesRef.current
    const currentTabId = tabIdRef.current
    const fetchForTabId = fetchTabIdRef.current
    
    // If tab changed while we were fetching, ignore this result
    if (currentTabId !== fetchForTabId) {
      console.log(`[News Feed] Ignoring fetch result - tab changed from ${fetchForTabId} to ${currentTabId}`)
      return
    }
    
    if (!useCache) {
      setError(null)
    } else {
      setLoading(true)
      setError(null)
    }
    
    try {
      const allNews = []
      
      // Use tab sources if provided, otherwise fall back to config
      const sourcesToFetch = currentTabSources && currentTabSources.length > 0 ? currentTabSources : loadNewsConfig().sources
      
      if (sourcesToFetch.length === 0) {
        console.log('[News Feed] No news sources configured.')
        setNews([])
        setLoading(false)
        setIsInitialLoad(false)
        return
      }
      
      console.log(`[News Feed] Fetching from ${sourcesToFetch.length} sources...`)
      const startTime = Date.now()
      
      // Fetch all sources in parallel
      const fetchPromises = sourcesToFetch.map(source => fetchRssFeed(source))
      const results = await Promise.all(fetchPromises)
      
      const fetchTime = Date.now() - startTime
      console.log(`[News Feed] Completed fetching in ${fetchTime}ms`)
      
      results.forEach((sourceNews, index) => {
        allNews.push(...sourceNews)
        if (sourceNews.length > 0 && sourcesToFetch[index]) {
          const sourceName = sourcesToFetch[index].name || (typeof sourcesToFetch[index] === 'string' ? sourcesToFetch[index] : 'Unknown')
          console.log(`[News Feed] ${sourceName}: ${sourceNews.length} articles`)
        }
      })
      
      console.log(`[News Feed] Total articles fetched: ${allNews.length}`)
      
      // Calculate popularity scores
      const newsWithScores = calculatePopularityScores(allNews)
      allNews.length = 0
      allNews.push(...newsWithScores)
      
      console.log(`[News Feed] After processing: ${allNews.length} articles`)
      
      // Sort by date
      allNews.sort((a, b) => {
        const dateA = a.publishedAt.getTime()
        const dateB = b.publishedAt.getTime()
        
        if (isNaN(dateA) && isNaN(dateB)) return 0
        if (isNaN(dateA)) return 1
        if (isNaN(dateB)) return -1
        
        return dateB - dateA
      })
      
      // Get current source names for filtering (trimmed and normalized)
      const currentSourceNames = new Set(
        sourcesToFetch
          .map(s => {
            const name = s.name || (typeof s === 'string' ? '' : s.name)
            return name ? name.trim() : ''
          })
          .filter(n => n.length > 0)
      )
      
      // Replace news completely (don't merge with previous tab's news)
      // This ensures we only show news from the current tab's sources
      const newIds = new Set()
      const finalNews = [...allNews] // Create a copy
      
      allNews.forEach(item => {
        newIds.add(item.id)
      })
      
      // Re-sort final news by date (newest first)
      finalNews.sort((a, b) => {
        const dateA = a.publishedAt.getTime()
        const dateB = b.publishedAt.getTime()
        
        if (isNaN(dateA) && isNaN(dateB)) return 0
        if (isNaN(dateA)) return 1
        if (isNaN(dateB)) return -1
        
        return dateB - dateA
      })
      
      // Double-check tab hasn't changed before setting news
      if (tabIdRef.current === fetchForTabId) {
        // Completely replace news (no merging with previous tab's news)
        setNews(finalNews)
        
        if (newIds.size > 0) {
          setNewItemIds(newIds)
          setTimeout(() => {
            setNewItemIds(new Set())
          }, 3000)
        }
        
        previousNewsIdsRef.current = new Set(finalNews.map(item => item.id))
        // Use currentTabId from ref to ensure we save to the correct tab's cache
        saveNewsToCache(finalNews, currentTabId)
      } else {
        console.log(`[News Feed] Tab changed during fetch, discarding results`)
      }
      
      setIsInitialLoad(false)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching news:', err)
      setIsInitialLoad(false)
    } finally {
      setLoading(false)
    }
  }, []) // Empty deps - uses refs for current values

  // Define fetchNews after fetchNewsInternal
  const fetchNews = useCallback(async (useCache = true, forceRefresh = false) => {
    // Get current values from refs to ensure we're using the latest tab
    const currentTabSources = tabSourcesRef.current
    const currentTabId = tabIdRef.current
    
    // Use tab sources if provided, otherwise fall back to config
    const sourcesToUse = currentTabSources && currentTabSources.length > 0 ? currentTabSources : loadNewsConfig().sources
    
    // Load cache for the CURRENT tab only
    const cachedNews = loadCachedNews(sourcesToUse, currentTabId)
    
    if (cachedNews && cachedNews.length > 0 && useCache && !forceRefresh) {
      // Completely replace news with cached news for this tab (no merging)
      setNews(cachedNews)
      setLoading(false)
      setIsInitialLoad(false)
      // Fetch fresh data in background (use setTimeout to avoid recursion)
      setTimeout(() => {
        fetchNewsInternal(false, false)
      }, 100)
      return
    }
    
    await fetchNewsInternal(useCache, forceRefresh)
  }, [fetchNewsInternal])

  // Initial fetch - re-fetch when tabSources or tabId change
  useEffect(() => {
    // Clear news immediately when tab changes to prevent showing old tab's articles
    setNews([])
    setLoading(true)
    setIsInitialLoad(true)
    setError(null)
    
    // Get current values from refs (they're already updated by the previous useEffect)
    const currentTabSources = tabSourcesRef.current
    const currentTabId = tabIdRef.current
    
    const sourcesToUse = currentTabSources && currentTabSources.length > 0 ? currentTabSources : loadNewsConfig().sources
    const cachedNews = loadCachedNews(sourcesToUse, currentTabId)
    if (cachedNews && cachedNews.length > 0) {
      setNews(cachedNews)
      setLoading(false)
      setIsInitialLoad(false)
      // Fetch fresh data in background
      setTimeout(() => {
        fetchNewsInternal(false, false)
      }, 100)
    } else {
      fetchNewsInternal(true, false)
    }
  }, [tabId, JSON.stringify(tabSources), fetchNewsInternal])

  return {
    news,
    loading,
    error,
    isInitialLoad,
    newItemIds,
    fetchNews,
    refreshNews: () => fetchNews(true, true)
  }
}
